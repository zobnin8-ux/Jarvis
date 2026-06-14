"use client";

import { useMemo } from "react";
import { formatTime } from "@/lib/format";
import {
  useModuleHealth,
  type ModuleHealthEntry,
  type ModuleHealthId,
} from "@/context/ModuleHealthContext";

export type FeedHealthState = "online" | "stale" | "offline";

export interface SystemFeedStatus {
  id: ModuleHealthId;
  label: string;
  state: FeedHealthState;
  lastUpdated: number | null;
}

export interface SystemStatusData {
  feeds: SystemFeedStatus[];
  lastUpdate: string;
}

const FEED_DEFS: { id: ModuleHealthId; label: string }[] = [
  { id: "weather", label: "Weather" },
  { id: "calendar", label: "Calendar" },
  { id: "space", label: "Space Feed" },
  { id: "briefing", label: "Briefing" },
];

function resolveState(entry: ModuleHealthEntry | undefined): FeedHealthState {
  if (!entry) return "offline";
  return entry.state;
}

export function useSystemStatus(): SystemStatusData | null {
  const health = useModuleHealth();

  return useMemo(() => {
    const feeds = FEED_DEFS.map(({ id, label }) => {
      const entry = health[id];
      return {
        id,
        label,
        state: resolveState(entry),
        lastUpdated: entry?.lastUpdated ?? null,
      };
    });

    const latest = feeds.reduce<number | null>((max, feed) => {
      if (!feed.lastUpdated) return max;
      return max === null ? feed.lastUpdated : Math.max(max, feed.lastUpdated);
    }, null);

    return {
      feeds,
      lastUpdate: latest ? formatTime(new Date(latest)) : formatTime(new Date()),
    };
  }, [health]);
}
