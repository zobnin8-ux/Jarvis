"use client";

import { motion } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";
import { ServiceUnavailablePanel } from "@/components/ui/ServiceUnavailablePanel";
import { useVoiceInput } from "@/hooks/useVoiceInput";
import { useVoiceOutput } from "@/hooks/useVoiceOutput";
import { isApiSuccess, isApiUnavailable, type ApiResponse } from "@/types/api";
import type { AskResponseData } from "@/types/modules";

type VoiceConsoleState = "idle" | "listening" | "thinking" | "speaking";

const ASK_TIMEOUT_MS = 45_000;
const SPEAK_TIMEOUT_MS = 90_000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("timeout")), ms);
    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

export function VoiceConsole() {
  const { speak, stop: stopSpeech } = useVoiceOutput();
  const [consoleState, setConsoleState] = useState<VoiceConsoleState>("idle");
  const [answer, setAnswer] = useState<string | null>(null);
  const [unavailable, setUnavailable] = useState<string | null>(null);
  const [liveTranscript, setLiveTranscript] = useState("");
  const processingRef = useRef(false);
  const isListeningRef = useRef(false);

  const processQuery = useCallback(
    async (query: string) => {
      const trimmed = query.trim();
      if (!trimmed) {
        setConsoleState("idle");
        return;
      }
      if (processingRef.current) return;

      processingRef.current = true;
      setConsoleState("thinking");
      setUnavailable(null);
      setAnswer(null);
      stopSpeech();

      try {
        const response = await withTimeout(
          fetch("/api/ask", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ query: trimmed }),
          }),
          ASK_TIMEOUT_MS
        );

        const json = (await response.json()) as ApiResponse<AskResponseData>;

        if (isApiUnavailable(json)) {
          setUnavailable(json.service);
          setConsoleState("idle");
          return;
        }

        if (!isApiSuccess(json)) {
          setUnavailable("claude");
          setConsoleState("idle");
          return;
        }

        setAnswer(json.data.text);
        setConsoleState("speaking");
        await withTimeout(speak(json.data.text), SPEAK_TIMEOUT_MS);
        setConsoleState("idle");
      } catch {
        setUnavailable("claude");
        setConsoleState("idle");
      } finally {
        processingRef.current = false;
      }
    },
    [speak, stopSpeech]
  );

  const handleFinalTranscript = useCallback(
    (text: string) => {
      setLiveTranscript(text);
      void processQuery(text);
    },
    [processQuery]
  );

  const { isListening, transcript, start, stop, supported } = useVoiceInput({
    onFinal: handleFinalTranscript,
  });

  isListeningRef.current = isListening;

  useEffect(() => {
    if (isListening) {
      setLiveTranscript(transcript);
    }
  }, [isListening, transcript]);

  const toggleListening = useCallback(() => {
    if (processingRef.current) return;
    if (consoleState === "thinking" || consoleState === "speaking") return;

    if (isListeningRef.current) {
      stop();
      return;
    }

    stopSpeech();
    setAnswer(null);
    setUnavailable(null);
    setLiveTranscript("");
    start();
    setConsoleState("listening");
  }, [consoleState, start, stop, stopSpeech]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code !== "Space" || event.repeat) return;
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT")
      ) {
        return;
      }
      event.preventDefault();
      toggleListening();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [toggleListening]);

  if (!supported) return null;

  return (
    <div className="voice-console" aria-label="Voice console">
      <button
        type="button"
        className={`voice-console-mic is-${consoleState}`}
        onClick={toggleListening}
        aria-pressed={isListening}
        aria-label="Toggle voice input"
        disabled={consoleState === "thinking" || consoleState === "speaking"}
      >
        <span className="voice-console-mic-icon" aria-hidden>
          {isListening ? "◉" : "◯"}
        </span>
      </button>

      <div className="voice-console-body">
        <div className="voice-console-label label">Voice</div>
        <div className="voice-console-state">{stateLabel(consoleState)}</div>

        {isListening && liveTranscript && (
          <p className="voice-console-transcript">{liveTranscript}</p>
        )}

        {unavailable && (
          <ServiceUnavailablePanel
            service={unavailable}
            className="voice-console-unavailable"
          />
        )}

        {answer && !unavailable && (
          <motion.p
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="voice-console-answer"
          >
            {answer}
          </motion.p>
        )}

        <div className="voice-console-hint">
          Пробел — начать · пробел — отправить
        </div>
      </div>
    </div>
  );
}

function stateLabel(state: VoiceConsoleState): string {
  switch (state) {
    case "listening":
      return "Слушаю…";
    case "thinking":
      return "Думаю…";
    case "speaking":
      return "Говорю…";
    default:
      return "Готов";
  }
}
