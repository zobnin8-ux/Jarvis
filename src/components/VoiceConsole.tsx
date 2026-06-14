"use client";

import { motion } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";
import { ServiceUnavailablePanel } from "@/components/ui/ServiceUnavailablePanel";
import { useVoiceInput } from "@/hooks/useVoiceInput";
import { useVoiceOutput } from "@/hooks/useVoiceOutput";
import { isApiSuccess, isApiUnavailable, type ApiResponse } from "@/types/api";
import type { AskResponseData } from "@/types/modules";

type VoiceConsoleState = "idle" | "listening" | "thinking" | "speaking";

export function VoiceConsole() {
  const { speak, stop: stopSpeech } = useVoiceOutput();
  const [consoleState, setConsoleState] = useState<VoiceConsoleState>("idle");
  const [answer, setAnswer] = useState<string | null>(null);
  const [unavailable, setUnavailable] = useState<string | null>(null);
  const [liveTranscript, setLiveTranscript] = useState("");
  const processingRef = useRef(false);

  const processQuery = useCallback(
    async (query: string) => {
      const trimmed = query.trim();
      if (!trimmed || processingRef.current) return;

      processingRef.current = true;
      setConsoleState("thinking");
      setUnavailable(null);
      setAnswer(null);
      stopSpeech();

      try {
        const response = await fetch("/api/ask", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ query: trimmed }),
        });

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
        await speak(json.data.text);
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

  useEffect(() => {
    if (isListening) {
      setLiveTranscript(transcript);
    }
  }, [isListening, transcript]);

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
      if (!isListening && !processingRef.current) {
        start();
        setConsoleState("listening");
      }
    };

    const onKeyUp = (event: KeyboardEvent) => {
      if (event.code !== "Space") return;
      if (isListening) stop();
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [isListening, start, stop]);

  if (!supported) return null;

  const handlePointerDown = () => {
    if (processingRef.current) return;
    stopSpeech();
    start();
    setConsoleState("listening");
    setAnswer(null);
    setUnavailable(null);
    setLiveTranscript("");
  };

  const handlePointerUp = () => {
    if (isListening) stop();
  };

  return (
    <div className="voice-console" aria-label="Voice console">
      <button
        type="button"
        className={`voice-console-mic is-${consoleState}`}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        aria-pressed={isListening}
        aria-label="Push to talk"
      >
        <span className="voice-console-mic-icon" aria-hidden>
          {consoleState === "listening" ? "◉" : "◯"}
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

        <div className="voice-console-hint">Удерживайте пробел или кнопку</div>
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
