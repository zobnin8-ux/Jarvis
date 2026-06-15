"use client";

import { useEffect, useState } from "react";

/** Physical small viewport */
const SMALL_VIEWPORT_QUERY = "(max-width: 1399px), (max-height: 849px)";

/** Window uses less than ~72% of monitor width → snapped half-screen, etc. */
const PARTIAL_SCREEN_RATIO = 0.72;

function detectNarrowHud(): boolean {
  if (typeof window === "undefined") return false;

  if (window.matchMedia(SMALL_VIEWPORT_QUERY).matches) return true;

  const screenWidth = window.screen?.width ?? window.innerWidth;
  if (screenWidth > 0 && window.innerWidth < screenWidth * PARTIAL_SCREEN_RATIO) {
    return true;
  }

  return false;
}

export function useNarrowHud(): boolean {
  const [isNarrow, setIsNarrow] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(SMALL_VIEWPORT_QUERY);

    const sync = () => setIsNarrow(detectNarrowHud());
    sync();

    media.addEventListener("change", sync);
    window.addEventListener("resize", sync);

    return () => {
      media.removeEventListener("change", sync);
      window.removeEventListener("resize", sync);
    };
  }, []);

  return isNarrow;
}

export type HudDrawerId = "space" | "briefing" | "news" | "iss";

export const HUD_DRAWER_LABELS: Record<HudDrawerId, string> = {
  space: "Space",
  briefing: "Briefing",
  news: "News",
  iss: "ISS",
};
