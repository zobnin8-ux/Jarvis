import { RITUAL_WAKE_PHRASE } from "@/config/morningRoutine";

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

export function normalizePhrase(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function isStopCommand(text: string): boolean {
  const n = normalizePhrase(text);
  return /\b(стоп|хватит|останов|прекрати)\b/u.test(n);
}

export function isAffirmative(text: string): boolean {
  const n = normalizePhrase(text);
  return (
    /^(да|конечно|давай|ок|хорошо|включай|включи|сделаем)\b/u.test(n) ||
    /\b(да|конечно|давай|хорошо|сделаем)\b/u.test(n)
  );
}

export function isNegative(text: string): boolean {
  const n = normalizePhrase(text);
  return /\b(нет|не надо|не хочу|пропуст|не нужно|неа)\b/u.test(n);
}

export function matchesWakePhrase(transcript: string): boolean {
  const n = normalizePhrase(transcript);
  const wake = normalizePhrase(RITUAL_WAKE_PHRASE);
  if (n.includes(wake)) return true;
  return n.includes("привет") && (n.includes("джарвис") || n.includes("jarvis"));
}

export function listenOnce(
  timeoutMs: number,
  abortRef: { current: boolean },
  lang = "ru-RU"
): Promise<string | null> {
  return new Promise((resolve) => {
    const Ctor = getRecognitionCtor();
    if (!Ctor || abortRef.current) {
      resolve(null);
      return;
    }

    const recognition = new Ctor();
    recognition.lang = lang;
    recognition.continuous = false;
    recognition.interimResults = true;

    let result = "";
    let settled = false;

    const finish = (value: string | null) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try {
        recognition.abort();
      } catch {
        /* ignore */
      }
      resolve(value);
    };

    const timer = setTimeout(() => {
      finish(result.trim() || null);
    }, timeoutMs);

    recognition.onresult = (event) => {
      let text = "";
      for (let i = 0; i < event.results.length; i++) {
        text += event.results[i][0]?.transcript ?? "";
      }
      result = text;
      if (isStopCommand(result)) {
        abortRef.current = true;
        finish(result.trim());
      }
    };

    recognition.onend = () => {
      if (!settled) finish(result.trim() || null);
    };

    recognition.onerror = () => {
      finish(result.trim() || null);
    };

    try {
      recognition.start();
    } catch {
      finish(null);
    }
  });
}

export function isSpeechRecognitionSupported(): boolean {
  return getRecognitionCtor() !== null;
}
