"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface UseVoiceInputOptions {
  lang?: string;
  /** Fired once when recognition session ends with the final transcript. */
  onFinal?: (transcript: string) => void;
}

interface UseVoiceInputResult {
  isListening: boolean;
  transcript: string;
  start: () => void;
  stop: () => void;
  supported: boolean;
}

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

export function useVoiceInput(
  options: UseVoiceInputOptions = {}
): UseVoiceInputResult {
  const lang = options.lang ?? "ru-RU";
  const onFinalRef = useRef(options.onFinal);
  onFinalRef.current = options.onFinal;

  const [supported, setSupported] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const latestTranscriptRef = useRef("");
  const deliveredFinalRef = useRef(false);
  const recognitionRef = useRef<RecognitionInstance | null>(null);

  useEffect(() => {
    const Ctor = getRecognitionCtor();
    if (!Ctor) {
      setSupported(false);
      return;
    }

    const recognition = new Ctor();
    recognition.lang = lang;
    recognition.continuous = false;
    recognition.interimResults = true;

    recognition.onresult = (event) => {
      let text = "";
      for (let i = 0; i < event.results.length; i++) {
        text += event.results[i][0]?.transcript ?? "";
      }
      const trimmed = text.trim();
      latestTranscriptRef.current = trimmed;
      setTranscript(trimmed);
    };

    recognition.onerror = () => {
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
      if (deliveredFinalRef.current) return;
      const finalText = latestTranscriptRef.current.trim();
      if (!finalText) return;
      deliveredFinalRef.current = true;
      onFinalRef.current?.(finalText);
    };

    recognitionRef.current = recognition;
    setSupported(true);

    return () => {
      recognition.abort();
      recognitionRef.current = null;
    };
  }, [lang]);

  const start = useCallback(() => {
    const recognition = recognitionRef.current;
    if (!recognition) return;
    deliveredFinalRef.current = false;
    latestTranscriptRef.current = "";
    setTranscript("");
    setIsListening(true);
    try {
      recognition.start();
    } catch {
      setIsListening(false);
    }
  }, []);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
    setIsListening(false);
  }, []);

  return { isListening, transcript, start, stop, supported };
}
