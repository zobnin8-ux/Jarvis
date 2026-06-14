"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useCoreResonance } from "@/context/CoreResonanceContext";
import {
  MORNING_EXERCISE,
  RITUAL_CLOSING_FALLBACK,
  RITUAL_MOOD_FALLBACK,
  type RoutineStep,
} from "@/config/morningRoutine";
import { getDayPartGreeting, getDayPart } from "@/lib/daypart";
import {
  isAffirmative,
  isNegative,
  isStopCommand,
  listenOnce,
} from "@/lib/speechRecognition";
import { useVoiceOutput } from "@/hooks/useVoiceOutput";
import { isApiSuccess, type ApiResponse } from "@/types/api";

export type RoutinePhase =
  | "idle"
  | "greeting"
  | "mood"
  | "mood-reply"
  | "exercise-offer"
  | "exercise"
  | "music-offer"
  | "closing";

const LISTEN_MS = 15_000;

function sleepMs(ms: number, abortRef: { current: boolean }): Promise<void> {
  return new Promise((resolve) => {
    const started = Date.now();
    const tick = () => {
      if (abortRef.current || Date.now() - started >= ms) {
        resolve();
        return;
      }
      window.setTimeout(tick, 100);
    };
    tick();
  });
}

async function fetchRitualLine(
  phase: "mood" | "closing",
  mood: string
): Promise<string> {
  try {
    const response = await fetch("/api/ritual", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ phase, mood }),
    });
    const json = (await response.json()) as ApiResponse<{ text: string }>;
    if (isApiSuccess(json) && json.data.text.trim()) {
      return json.data.text.trim();
    }
  } catch {
    /* fallback below */
  }
  return phase === "mood" ? RITUAL_MOOD_FALLBACK : RITUAL_CLOSING_FALLBACK;
}

async function askYesNo(
  prompt: string,
  speak: (text: string) => Promise<void>,
  abortRef: { current: boolean }
): Promise<boolean> {
  await speak(prompt);
  if (abortRef.current) return false;

  const answer = await listenOnce(LISTEN_MS, abortRef);
  if (abortRef.current || !answer) return false;

  if (isStopCommand(answer)) {
    abortRef.current = true;
    return false;
  }
  if (isAffirmative(answer)) return true;
  if (isNegative(answer)) return false;
  return false;
}

export function useRoutineEngine() {
  const { speak, stop: stopSpeech } = useVoiceOutput();
  const { play } = useCoreResonance();
  const abortRef = useRef(false);
  const runningRef = useRef(false);
  const [phase, setPhase] = useState<RoutinePhase>("idle");
  const [running, setRunning] = useState(false);
  const [exerciseLabel, setExerciseLabel] = useState<string | null>(null);

  const abort = useCallback(() => {
    abortRef.current = true;
    stopSpeech();
    runningRef.current = false;
    setRunning(false);
    setPhase("idle");
    setExerciseLabel(null);
  }, [stopSpeech]);

  const runExerciseStep = useCallback(
    async (step: Extract<RoutineStep, { kind: "exercise" }>) => {
      await speak(step.name);
      if (abortRef.current) return;

      if (step.countIn) {
        await speak("Три");
        if (abortRef.current) return;
        await speak("Два");
        if (abortRef.current) return;
        await speak("Один");
        if (abortRef.current) return;
        await speak("Поехали");
      } else {
        await speak(step.name);
      }
      if (abortRef.current) return;

      const halfMs = (step.durationSec * 1000) / 2;
      const totalMs = step.durationSec * 1000;

      await sleepMs(halfMs, abortRef);
      if (abortRef.current) return;
      await speak("Половина пути");
      await sleepMs(totalMs - halfMs, abortRef);
      if (abortRef.current) return;
      await speak("Готово");
    },
    [speak]
  );

  const run = useCallback(async () => {
    if (runningRef.current) return;

    abortRef.current = false;
    runningRef.current = true;
    setRunning(true);

    const userName = process.env.NEXT_PUBLIC_USER_NAME ?? "Andrei";
    const dayPart = getDayPart(new Date());

    try {
      setPhase("greeting");
      await speak(getDayPartGreeting(userName, dayPart));
      if (abortRef.current) return;

      setPhase("mood");
      await speak("Как настроение?");
      const moodAnswer = await listenOnce(LISTEN_MS, abortRef);
      if (abortRef.current) return;
      const moodText = moodAnswer?.trim() || "нормально";

      setPhase("mood-reply");
      const moodReply = await fetchRitualLine("mood", moodText);
      await speak(moodReply);
      if (abortRef.current) return;

      setPhase("exercise-offer");
      const doExercise = await askYesNo(
        "Сделаем короткую зарядку?",
        speak,
        abortRef
      );
      if (abortRef.current) return;

      if (doExercise) {
        setPhase("exercise");
        for (const step of MORNING_EXERCISE) {
          if (abortRef.current) break;
          if (step.kind === "say") {
            await speak(step.text);
          } else {
            setExerciseLabel(step.name);
            await runExerciseStep(step);
            setExerciseLabel(null);
          }
        }
      }

      if (abortRef.current) return;

      setPhase("music-offer");
      const playMusic = await askYesNo("Включить музыку?", speak, abortRef);
      if (abortRef.current) return;
      if (playMusic) {
        play();
      }

      setPhase("closing");
      const closing = await fetchRitualLine("closing", moodText);
      await speak(closing);
    } finally {
      runningRef.current = false;
      setRunning(false);
      setPhase("idle");
      setExerciseLabel(null);
    }
  }, [play, runExerciseStep, speak]);

  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden && runningRef.current) {
        abort();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [abort]);

  return { run, abort, phase, running, exerciseLabel };
}
