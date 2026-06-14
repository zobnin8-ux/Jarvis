"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useState } from "react";
import { Panel } from "@/components/ui/Panel";
import { ServiceUnavailablePanel } from "@/components/ui/ServiceUnavailablePanel";
import { NEWS_ROTATION_MS } from "@/config/news";
import { useNightMode } from "@/context/NightModeContext";
import { useAdaptivePoll } from "@/hooks/useAdaptivePoll";
import { useIntervalFetch } from "@/hooks/useIntervalFetch";
import { getModuleConfig } from "@/lib/moduleRegistry";
import { fetchWorldNews } from "@/services/worldNewsService";
import type { NewsHeadline } from "@/types/modules";

function formatRelativeTime(publishedAt: string, lang: NewsHeadline["lang"]): string {
  const diffMs = Date.now() - new Date(publishedAt).getTime();
  const mins = Math.max(1, Math.round(diffMs / 60_000));

  if (lang === "ru") {
    if (mins < 60) return `${mins} мин назад`;
    const hours = Math.round(mins / 60);
    if (hours < 24) return `${hours} ч назад`;
    const days = Math.round(hours / 24);
    return `${days} дн назад`;
  }

  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  return `${days} d ago`;
}

export function WorldNewsModule() {
  const config = getModuleConfig("world-news");
  const { isNightMode } = useNightMode();
  const fetcher = useCallback(() => fetchWorldNews(), []);
  const dayInterval = config?.refreshInterval ?? 10 * 60 * 1000;
  const poll = useAdaptivePoll("worldNews", dayInterval);
  const { data, loading, unavailableService } = useIntervalFetch({
    fetcher,
    interval: poll.intervalMs,
    paused: poll.paused,
    cacheKey: "jarvis-cache-v2-world-news",
  });

  const headlines = data?.headlines ?? [];
  const [index, setIndex] = useState(0);

  useEffect(() => {
    setIndex(0);
  }, [data?.generatedAt]);

  useEffect(() => {
    if (isNightMode || headlines.length <= 1) return;

    let timer: number | undefined;

    const schedule = () => {
      window.clearTimeout(timer);
      if (document.hidden) return;
      timer = window.setTimeout(() => {
        setIndex((prev) => (prev + 1) % headlines.length);
        schedule();
      }, NEWS_ROTATION_MS);
    };

    const onVisibility = () => {
      if (document.hidden) {
        window.clearTimeout(timer);
      } else {
        schedule();
      }
    };

    schedule();
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [headlines.length, data?.generatedAt, isNightMode]);

  const current = headlines[index];

  return (
    <Panel className="world-news-panel h-full p-4 md:p-5" delay={0.35}>
      <div className="label mb-3">World News</div>

      {unavailableService ? (
        <ServiceUnavailablePanel service={unavailableService} />
      ) : loading && !data ? (
        <p className="text-sm text-white/30">Loading headlines...</p>
      ) : !current ? (
        <p className="world-news-empty text-sm text-white/35">
          No headlines available
        </p>
      ) : (
        <div className="world-news-slide" aria-live="polite">
          <AnimatePresence mode="wait">
            <motion.div
              key={`${current.source}-${current.title}`}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.45, ease: "easeInOut" }}
            >
              <div className="world-news-meta">
                {current.sourceLabel} · {formatRelativeTime(current.publishedAt, current.lang)}
              </div>
              <a
                href={current.url}
                target="_blank"
                rel="noopener noreferrer"
                className="world-news-headline"
              >
                {current.title}
              </a>
            </motion.div>
          </AnimatePresence>
        </div>
      )}
    </Panel>
  );
}
