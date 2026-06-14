"use client";

import { useEffect, useMemo, useState } from "react";
import {
  resolveAdaptivePoll,
  type NightPollModuleId,
} from "@/config/nightMode";
import { useNightMode } from "@/context/NightModeContext";

export function useTabHidden(): boolean {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const sync = () => setHidden(document.hidden);
    sync();
    document.addEventListener("visibilitychange", sync);
    return () => document.removeEventListener("visibilitychange", sync);
  }, []);

  return hidden;
}

export function useAdaptivePoll(
  moduleId: NightPollModuleId,
  dayIntervalMs: number
): { intervalMs: number; paused: boolean } {
  const { isNightMode } = useNightMode();
  const tabHidden = useTabHidden();

  return useMemo(
    () => resolveAdaptivePoll(moduleId, dayIntervalMs, isNightMode, tabHidden),
    [moduleId, dayIntervalMs, isNightMode, tabHidden]
  );
}
