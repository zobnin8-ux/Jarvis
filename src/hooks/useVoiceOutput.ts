"use client";

import { useCallback, useRef, useState } from "react";
import { isApiUnavailable, type ApiResponse } from "@/types/api";

type VoiceOutputState = "idle" | "speaking";

interface UseVoiceOutputResult {
  speak: (text: string) => Promise<void>;
  state: VoiceOutputState;
  stop: () => void;
}

function speakWithBrowser(text: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.speechSynthesis) {
      reject(new Error("Speech synthesis unavailable"));
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "ru-RU";
    utterance.rate = 0.95;
    utterance.onend = () => resolve();
    utterance.onerror = () => reject(new Error("Speech synthesis error"));
    window.speechSynthesis.speak(utterance);
  });
}

export function useVoiceOutput(): UseVoiceOutputResult {
  const [state, setState] = useState<VoiceOutputState>("idle");
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const stop = useCallback(() => {
    audioRef.current?.pause();
    audioRef.current = null;
    if (typeof window !== "undefined") {
      window.speechSynthesis?.cancel();
    }
    setState("idle");
  }, []);

  const speak = useCallback(
    async (text: string) => {
      stop();
      setState("speaking");

      try {
        const response = await fetch("/api/tts", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ text }),
        });

        const contentType = response.headers.get("content-type") ?? "";

        if (
          response.ok &&
          contentType.includes("audio") &&
          !contentType.includes("json")
        ) {
          const blob = await response.blob();
          const url = URL.createObjectURL(blob);
          const audio = new Audio(url);
          audioRef.current = audio;
          await new Promise<void>((resolve, reject) => {
            audio.onended = () => {
              URL.revokeObjectURL(url);
              resolve();
            };
            audio.onerror = () => {
              URL.revokeObjectURL(url);
              reject(new Error("Audio playback error"));
            };
            void audio.play().catch(reject);
          });
          setState("idle");
          return;
        }

        if (contentType.includes("json")) {
          const json = (await response.json()) as ApiResponse<unknown>;
          if (isApiUnavailable(json)) {
            await speakWithBrowser(text);
            setState("idle");
            return;
          }
        }

        await speakWithBrowser(text);
        setState("idle");
      } catch {
        try {
          await speakWithBrowser(text);
        } catch {
          // ignore — text still visible in UI
        }
        setState("idle");
      }
    },
    [stop]
  );

  return { speak, state, stop };
}
