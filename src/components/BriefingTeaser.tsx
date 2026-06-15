"use client";

import { useCallback } from "react";
import { ServiceUnavailablePanel } from "@/components/ui/ServiceUnavailablePanel";
import { useAdaptivePoll } from "@/hooks/useAdaptivePoll";
import { useIntervalFetch } from "@/hooks/useIntervalFetch";
import { fetchBriefing } from "@/services/briefingService";
import { getModuleConfig } from "@/lib/moduleRegistry";

interface BriefingTeaserProps {
  onExpand: () => void;
}

export function BriefingTeaser({ onExpand }: BriefingTeaserProps) {
  const config = getModuleConfig("ai-briefing");
  const fetcher = useCallback(() => fetchBriefing(), []);
  const dayInterval = config?.refreshInterval ?? 60 * 60 * 1000;
  const poll = useAdaptivePoll("briefing", dayInterval);
  const { data, loading, isStale, unavailableService } = useIntervalFetch({
    fetcher,
    interval: poll.intervalMs,
    paused: poll.paused,
    cacheKey: "jarvis-cache-v2-briefing",
    healthId: "briefing",
  });

  return (
    <button
      type="button"
      className="briefing-teaser panel panel-glow"
      onClick={onExpand}
      aria-label="Open full briefing"
    >
      <div className="briefing-teaser-head">
        <span className="label">Briefing</span>
        {isStale && (
          <span className="briefing-teaser-stale">Устарело</span>
        )}
        <span className="briefing-teaser-expand" aria-hidden>
          ▸
        </span>
      </div>

      {unavailableService ? (
        <ServiceUnavailablePanel service={unavailableService} className="mt-2" />
      ) : loading && !data ? (
        <p className="briefing-teaser-text mt-2">Compiling briefing...</p>
      ) : data ? (
        <p className="briefing-teaser-text mt-2">{data.text}</p>
      ) : null}
    </button>
  );
}
