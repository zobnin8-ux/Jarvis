"use client";

import { useMemo } from "react";
import {
  resolveAdaptivePoll,
  type NightPollModuleId,
} from "@/config/nightMode";
import { useNightMode } from "@/context/NightModeContext";

export function useAdaptivePoll(
  moduleId: NightPollModuleId,
  dayIntervalMs: number
): { intervalMs: number; paused: boolean } {
  const { isNightMode } = useNightMode();

  return useMemo(
    () => resolveAdaptivePoll(moduleId, dayIntervalMs, isNightMode),
    [moduleId, dayIntervalMs, isNightMode]
  );
}
