"use client";

import { useCallback, useRef, useState } from "react";
import { isApiUnavailable, type ApiResponse } from "@/types/api";

type VoiceOutputState = "idle" | "speaking";

interface UseVoiceOutputResult {
  speak: (text: string) => Promise<void>;
  state: VoiceOutputState;
  stop: () => void;
}

function cancelBrowserSpeech(): void {
  if (typeof window !== "undefined") {
    window.speechSynthesis?.cancel();
  }
}

function speakWithBrowser(text: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.speechSynthesis) {
      reject(new Error("Speech synthesis unavailable"));
      return;
    }

    cancelBrowserSpeech();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "ru-RU";
    utterance.rate = 0.95;
    utterance.onend = () => resolve();
    utterance.onerror = () => reject(new Error("Speech synthesis error"));
    window.speechSynthesis.speak(utterance);
  });
}

function isAudioContentType(contentType: string): boolean {
  const lower = contentType.toLowerCase();
  return (
    lower.includes("audio/") ||
    lower.includes("mpeg") ||
    lower.includes("octet-stream")
  );
}

export function useVoiceOutput(): UseVoiceOutputResult {
  const [state, setState] = useState<VoiceOutputState>("idle");
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const generationRef = useRef(0);

  const stop = useCallback(() => {
    generationRef.current += 1;
    audioRef.current?.pause();
    audioRef.current = null;
    cancelBrowserSpeech();
    setState("idle");
  }, []);

  const speak = useCallback(
    async (text: string) => {
      const generation = ++generationRef.current;
      audioRef.current?.pause();
      audioRef.current = null;
      cancelBrowserSpeech();
      setState("speaking");

      const isCurrent = () => generation === generationRef.current;

      try {
        const response = await fetch("/api/tts", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ text }),
        });

        if (!isCurrent()) return;

        const contentType = response.headers.get("content-type") ?? "";

        if (response.ok && isAudioContentType(contentType)) {
          const blob = await response.blob();
          if (!isCurrent()) return;
          if (blob.size === 0) throw new Error("Empty TTS audio");

          cancelBrowserSpeech();
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

          if (isCurrent()) setState("idle");
          return;
        }

        if (contentType.includes("json")) {
          const json = (await response.json()) as ApiResponse<unknown>;
          if (isApiUnavailable(json)) {
            if (!isCurrent()) return;
            await speakWithBrowser(text);
            if (isCurrent()) setState("idle");
            return;
          }
        }

        if (!isCurrent()) return;
        await speakWithBrowser(text);
        if (isCurrent()) setState("idle");
      } catch {
        if (!isCurrent()) return;
        try {
          await speakWithBrowser(text);
        } catch {
          // text remains visible in UI
        }
        if (isCurrent()) setState("idle");
      }
    },
    []
  );

  return { speak, state, stop };
}
