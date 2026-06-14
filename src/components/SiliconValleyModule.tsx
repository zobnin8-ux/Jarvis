"use client";

import { useCallback } from "react";
import { useIntervalFetch } from "@/hooks/useIntervalFetch";
import { ServiceUnavailablePanel } from "@/components/ui/ServiceUnavailablePanel";
import { fetchSvEvents } from "@/services/svService";
import { getModuleConfig } from "@/lib/moduleRegistry";
import type { SvTickerItem } from "@/types/modules";

export function SiliconValleyModule() {
  const config = getModuleConfig("silicon-valley");
  const fetcher = useCallback(() => fetchSvEvents(), []);
  const { data, loading, unavailableService } = useIntervalFetch({
    fetcher,
    interval: config?.refreshInterval ?? 5 * 60 * 1000,
    cacheKey: "jarvis-cache-sv",
  });

  if (unavailableService) {
    return (
      <div className="sv-ticker-bar">
        <ServiceUnavailablePanel service={unavailableService} />
      </div>
    );
  }

  if (loading && !data) {
    return (
      <div className="sv-ticker-bar">
        <div className="sv-ticker-label label">Silicon Valley</div>
        <div className="sv-ticker-loading">Syncing feed...</div>
      </div>
    );
  }

  if (!data) return null;

  const loop = [...data.items, ...data.items];

  return (
    <div className="sv-ticker-bar" aria-label="Silicon Valley ticker">
      <div className="sv-ticker-label label">SV</div>
      <div className="sv-ticker-track-wrap">
        <div className="sv-ticker-track">
          {loop.map((item, index) => (
            <TickerChip key={`${item.id}-${index}`} item={item} />
          ))}
        </div>
      </div>
    </div>
  );
}

function TickerChip({ item }: { item: SvTickerItem }) {
  const changeTone =
    item.change == null
      ? ""
      : item.change >= 0
        ? " sv-ticker-change--up"
        : " sv-ticker-change--down";

  return (
    <span className="sv-ticker-item">
      <span className="sv-ticker-item-label">{item.label}</span>
      <span className="sv-ticker-item-detail">{item.detail}</span>
      {item.change != null && (
        <span className={`sv-ticker-change${changeTone}`}>
          {item.change >= 0 ? "+" : ""}
          {item.change.toFixed(2)}%
        </span>
      )}
      <span className="sv-ticker-sep" aria-hidden>
        ·
      </span>
    </span>
  );
}
