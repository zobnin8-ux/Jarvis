"use client";

import { useEffect, useState } from "react";

const EVENTS = ["mousemove", "mousedown", "keydown", "touchstart", "wheel"] as const;

export function useIdleMode(timeoutMs = 45_000): boolean {
  const [isIdle, setIsIdle] = useState(false);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;

    const reset = () => {
      setIsIdle(false);
      clearTimeout(timer);
      timer = setTimeout(() => setIsIdle(true), timeoutMs);
    };

    reset();

    for (const event of EVENTS) {
      window.addEventListener(event, reset, { passive: true });
    }

    return () => {
      clearTimeout(timer);
      for (const event of EVENTS) {
        window.removeEventListener(event, reset);
      }
    };
  }, [timeoutMs]);

  return isIdle;
}
