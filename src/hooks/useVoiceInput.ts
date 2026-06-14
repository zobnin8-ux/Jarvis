"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface UseVoiceInputOptions {
  lang?: string;
  /** Fired when the user explicitly stops listening (toggle off). */
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
  const userStoppedRef = useRef(false);
  const wantListeningRef = useRef(false);
  const recognitionRef = useRef<RecognitionInstance | null>(null);

  useEffect(() => {
    const Ctor = getRecognitionCtor();
    if (!Ctor) {
      setSupported(false);
      return;
    }

    const recognition = new Ctor();
    recognition.lang = lang;
    recognition.continuous = true;
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
      wantListeningRef.current = false;
      userStoppedRef.current = false;
      setIsListening(false);
    };

    recognition.onend = () => {
      if (userStoppedRef.current) {
        setIsListening(false);
        wantListeningRef.current = false;
        if (deliveredFinalRef.current) return;
        deliveredFinalRef.current = true;
        onFinalRef.current?.(latestTranscriptRef.current.trim());
        return;
      }

      if (wantListeningRef.current) {
        try {
          recognition.start();
          setIsListening(true);
        } catch {
          wantListeningRef.current = false;
          setIsListening(false);
        }
        return;
      }

      setIsListening(false);
    };

    recognitionRef.current = recognition;
    setSupported(true);

    return () => {
      wantListeningRef.current = false;
      recognition.abort();
      recognitionRef.current = null;
    };
  }, [lang]);

  const start = useCallback(() => {
    const recognition = recognitionRef.current;
    if (!recognition) return;
    deliveredFinalRef.current = false;
    userStoppedRef.current = false;
    wantListeningRef.current = true;
    latestTranscriptRef.current = "";
    setTranscript("");
    setIsListening(true);
    try {
      recognition.start();
    } catch {
      wantListeningRef.current = false;
      setIsListening(false);
    }
  }, []);

  const stop = useCallback(() => {
    const recognition = recognitionRef.current;
    if (!recognition || !wantListeningRef.current) return;
    userStoppedRef.current = true;
    wantListeningRef.current = false;
    try {
      recognition.stop();
    } catch {
      setIsListening(false);
      if (!deliveredFinalRef.current) {
        deliveredFinalRef.current = true;
        onFinalRef.current?.(latestTranscriptRef.current.trim());
      }
    }
  }, []);

  return { isListening, transcript, start, stop, supported };
}
