"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { RITUAL_WAKE_PHRASE } from "@/config/morningRoutine";
import {
  type RoutinePhase,
  useRoutineEngine,
} from "@/hooks/useRoutineEngine";
import {
  isSpeechRecognitionSupported,
  matchesWakePhrase,
} from "@/lib/speechRecognition";

type RecognitionInstance = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: {
    results: {
      length: number;
      [index: number]: { [index: number]: { transcript: string } };
    };
  }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
};

type RecognitionCtor = new () => RecognitionInstance;

function getRecognitionCtor(): RecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as Window & {
    SpeechRecognition?: RecognitionCtor;
    webkitSpeechRecognition?: RecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

function phaseLabel(phase: RoutinePhase, exerciseLabel: string | null): string {
  switch (phase) {
    case "greeting":
      return "Приветствие";
    case "mood":
      return "Настроение";
    case "mood-reply":
      return "Реакция";
    case "exercise-offer":
      return "Зарядка?";
    case "exercise":
      return exerciseLabel ? `Упражнение: ${exerciseLabel}` : "Зарядка";
    case "music-offer":
      return "Музыка?";
    case "closing":
      return "Финал";
    default:
      return "Готов";
  }
}

export function MorningRitual() {
  const { run, abort, phase, running, exerciseLabel } = useRoutineEngine();
  const [wakeListen, setWakeListen] = useState(false);
  const wakeListenRef = useRef(false);
  const runningRef = useRef(false);
  const recognitionRef = useRef<RecognitionInstance | null>(null);
  const supported = isSpeechRecognitionSupported();

  runningRef.current = running;
  wakeListenRef.current = wakeListen;

  const startRitual = useCallback(() => {
    if (runningRef.current) return;
    void run();
  }, [run]);

  useEffect(() => {
    if (!wakeListen || !supported) return;

    const Ctor = getRecognitionCtor();
    if (!Ctor) return;

    const recognition = new Ctor();
    recognition.lang = "ru-RU";
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = (event) => {
      let text = "";
      for (let i = 0; i < event.results.length; i++) {
        text += event.results[i][0]?.transcript ?? "";
      }
      if (matchesWakePhrase(text) && !runningRef.current) {
        wakeListenRef.current = false;
        setWakeListen(false);
        try {
          recognition.stop();
        } catch {
          /* ignore */
        }
        void run();
      }
    };

    recognition.onend = () => {
      if (wakeListenRef.current) {
        try {
          recognition.start();
        } catch {
          setWakeListen(false);
        }
      }
    };

    recognition.onerror = () => {
      if (!wakeListenRef.current) return;
      try {
        recognition.start();
      } catch {
        setWakeListen(false);
      }
    };

    recognitionRef.current = recognition;

    try {
      recognition.start();
    } catch {
      setWakeListen(false);
    }

    return () => {
      wakeListenRef.current = false;
      try {
        recognition.abort();
      } catch {
        /* ignore */
      }
      recognitionRef.current = null;
    };
  }, [wakeListen, supported, run]);

  return (
    <div className="morning-ritual" aria-label="Утренний ритуал">
      <div className="morning-ritual-actions">
        <button
          type="button"
          className="morning-ritual-start"
          onClick={startRitual}
          disabled={running}
        >
          Утро / Ритуал
        </button>

        {supported && (
          <label className="morning-ritual-wake">
            <input
              type="checkbox"
              checked={wakeListen}
              onChange={(event) => setWakeListen(event.target.checked)}
              disabled={running}
            />
            <span>Слушать «{RITUAL_WAKE_PHRASE}»</span>
          </label>
        )}

        {running && (
          <button
            type="button"
            className="morning-ritual-stop"
            onClick={abort}
          >
            Стоп
          </button>
        )}
      </div>

      <div className="morning-ritual-status">
        <span className="label">Ритуал</span>
        <span className="morning-ritual-phase">
          {phaseLabel(phase, exerciseLabel)}
        </span>
      </div>

      {wakeListen && (
        <p className="morning-ritual-privacy">
          Микрофон активен для фразы будилки. Chrome / Edge.
        </p>
      )}
    </div>
  );
}
