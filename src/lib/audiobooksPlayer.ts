export const AUDIOBOOK_PROGRESS_KEY = "jarvis-audiobook-progress";

export const PROGRESS_SAVE_INTERVAL_MS = 7_000;

export interface StoredAudiobookProgress {
  videoId: string;
  positionSec: number;
  title: string;
  thumbnailUrl: string;
  publishedAt: string;
  durationSec?: number;
}

export function readAudiobookProgress(): StoredAudiobookProgress | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(AUDIOBOOK_PROGRESS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredAudiobookProgress;
    if (!parsed.videoId || typeof parsed.positionSec !== "number") return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeAudiobookProgress(progress: StoredAudiobookProgress): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(AUDIOBOOK_PROGRESS_KEY, JSON.stringify(progress));
  } catch {
    /* ignore quota */
  }
}

export function formatAudiobookDuration(totalSec: number): string {
  if (!Number.isFinite(totalSec) || totalSec <= 0) return "—";
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = Math.floor(totalSec % 60);
  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${m}:${String(s).padStart(2, "0")}`;
}

function loadYouTubeIframeApi(): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("No window"));
  }
  if (window.YT?.Player) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const existing = document.querySelector('script[src*="youtube.com/iframe_api"]');
    if (!existing) {
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      tag.async = true;
      tag.onerror = () => reject(new Error("YouTube iframe API load failed"));
      document.head.appendChild(tag);
    }

    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previous?.();
      resolve();
    };

    const poll = window.setInterval(() => {
      if (window.YT?.Player) {
        window.clearInterval(poll);
        resolve();
      }
    }, 100);

    window.setTimeout(() => {
      window.clearInterval(poll);
      if (!window.YT?.Player) {
        reject(new Error("YouTube iframe API timeout"));
      }
    }, 15_000);
  });
}

export { loadYouTubeIframeApi };
