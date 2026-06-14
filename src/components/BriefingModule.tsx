"use client";

import { useCallback } from "react";
import { Panel } from "@/components/ui/Panel";
import { ServiceUnavailablePanel } from "@/components/ui/ServiceUnavailablePanel";
import { useIntervalFetch } from "@/hooks/useIntervalFetch";
import { fetchBriefing } from "@/services/briefingService";
import { getModuleConfig } from "@/lib/moduleRegistry";

export function BriefingModule() {
  const config = getModuleConfig("ai-briefing");
  const fetcher = useCallback(() => fetchBriefing(), []);
  const { data, loading, isStale, unavailableService } = useIntervalFetch({
    fetcher,
    interval: config?.refreshInterval ?? 60 * 60 * 1000,
    cacheKey: "jarvis-cache-v2-briefing",
    healthId: "briefing",
  });

  const generatedLabel = data
    ? new Date(data.generatedAt).toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      })
    : null;

  return (
    <Panel className="briefing-panel p-4 md:p-5" delay={0.15}>
      <div className="flex items-baseline justify-between gap-2">
        <div className="label">Briefing</div>
        {isStale && (
          <span className="font-mono text-[0.52rem] tracking-[0.14em] text-secondary uppercase">
            Stale
          </span>
        )}
      </div>

      {unavailableService ? (
        <ServiceUnavailablePanel service={unavailableService} className="mt-3" />
      ) : loading && !data ? (
        <p className="mt-3 text-sm text-white/30">Compiling briefing...</p>
      ) : data ? (
        <>
          <p className="briefing-text mt-3">{data.text}</p>
          {generatedLabel && (
            <div className="briefing-meta mt-3">
              Generated {generatedLabel}
            </div>
          )}
        </>
      ) : null}
    </Panel>
  );
}
