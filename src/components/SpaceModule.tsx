"use client";

import { motion } from "framer-motion";
import { useCallback } from "react";
import { LaunchCountdown } from "@/components/LaunchCountdown";
import { Panel } from "@/components/ui/Panel";
import { ServiceUnavailablePanel } from "@/components/ui/ServiceUnavailablePanel";
import { useAdaptivePoll } from "@/hooks/useAdaptivePoll";
import { useIntervalFetch } from "@/hooks/useIntervalFetch";
import { formatPostLaunchRemaining } from "@/lib/spaceLaunch";
import { fetchNasaNews } from "@/services/nasaNewsService";
import { fetchSpaceLaunch } from "@/services/spaceService";
import type { LaunchOutcome, SpaceLaunch } from "@/types/modules";

const SPACE_POLL_INTERVAL = 30 * 60 * 1000;
const NASA_POLL_INTERVAL = 60 * 60 * 1000;

export function SpaceModule() {
  const launchFetcher = useCallback(() => fetchSpaceLaunch(), []);
  const nasaFetcher = useCallback(() => fetchNasaNews(), []);
  const spacePoll = useAdaptivePoll("space", SPACE_POLL_INTERVAL);
  const nasaPoll = useAdaptivePoll("nasa", NASA_POLL_INTERVAL);

  const {
    data: launch,
    loading: launchLoading,
    isStale: launchStale,
    unavailableService,
  } = useIntervalFetch({
    fetcher: launchFetcher,
    interval: spacePoll.intervalMs,
    paused: spacePoll.paused,
    cacheKey: "jarvis-cache-v2-space",
    healthId: "space",
  });

  const { data: nasaNews } = useIntervalFetch({
    fetcher: nasaFetcher,
    interval: nasaPoll.intervalMs,
    paused: nasaPoll.paused,
    cacheKey: "jarvis-cache-v2-nasa-news",
  });

  const isLoading = launchLoading && !launch;
  const showLaunchUnavailable = unavailableService && !launch;

  return (
    <Panel className="space-panel p-5 md:p-6" delay={0.3}>
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="label">Orbital Operations</div>
        {launch && <StatusBadge launch={launch} />}
      </div>

      {showLaunchUnavailable ? (
        <ServiceUnavailablePanel service={unavailableService} className="mt-4" />
      ) : isLoading ? (
        <div className="mt-4 text-sm text-white/30">Tracking launch manifest...</div>
      ) : launch ? (
        <>
          {launchStale && (
            <div className="mt-3 font-mono text-[0.52rem] tracking-[0.14em] text-secondary uppercase">
              Launch feed stale
            </div>
          )}
          <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Operator" value={launch.operator} />
            <Field label="Rocket" value={launch.rocket} />
            <Field label="Mission" value={launch.mission} />
            <Field label="Launch Site" value={launch.padName} />
          </div>

          {launch.phase !== "postlaunch" && (
            <>
              <div className="divider my-5" />
              <div>
                <div className="label mb-3">Countdown</div>
                <LaunchCountdown
                  launchTime={launch.launchTime}
                  status={launch.status}
                  phase={launch.phase}
                />
              </div>
            </>
          )}

          {(launch.phase === "liftoff" || launch.phase === "postlaunch") && (
            <PostLaunchReport launch={launch} />
          )}
        </>
      ) : null}

      {nasaNews && <NasaNewsSection headline={nasaNews} />}
    </Panel>
  );
}

function NasaNewsSection({
  headline,
}: {
  headline: { title: string; link: string };
}) {
  return (
    <section className="space-nasa mt-5" aria-label="NASA news">
      <div className="label mb-2">NASA</div>
      <a
        href={headline.link}
        target="_blank"
        rel="noopener noreferrer"
        className="space-nasa-headline"
      >
        {headline.title}
      </a>
    </section>
  );
}

function PostLaunchReport({ launch }: { launch: SpaceLaunch }) {
  const remaining = formatPostLaunchRemaining(launch.postLaunchExpiresAt);
  const liftoffTime = new Date(launch.launchTime).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  return (
    <section className="launch-report mt-5" aria-label="Launch outcome">
      {launch.phase === "postlaunch" && (
        <div className="launch-report-header">
          <div className="label mb-2">Mission Report</div>
          <div className="launch-report-liftoff">
            Liftoff {liftoffTime} UTC ·{" "}
            <OutcomeLabel outcome={launch.outcome} />
          </div>
        </div>
      )}

      {launch.detailLines.length > 0 && (
        <div className="launch-report-details">
          {launch.detailLines.map((line) => (
            <div key={line.label} className="launch-report-row">
              <span className="launch-report-label">{line.label}</span>
              <span className="launch-report-value">{line.value}</span>
            </div>
          ))}
        </div>
      )}

      {launch.newsHeadline && (
        <div className="launch-report-news">
          <div className="launch-report-news-label">Signal</div>
          <p className="launch-report-news-headline">{launch.newsHeadline}</p>
          {launch.newsSource && (
            <div className="launch-report-news-source">{launch.newsSource}</div>
          )}
        </div>
      )}

      {remaining && (
        <div className="launch-report-remaining">
          Telemetry hold · {remaining} until next manifest
        </div>
      )}
    </section>
  );
}

function OutcomeLabel({ outcome }: { outcome: LaunchOutcome }) {
  const tone =
    outcome === "SUCCESS" || outcome === "PARTIAL"
      ? "text-secondary"
      : outcome === "FAILURE"
        ? "text-red-300/80"
        : "text-white/55";

  return (
    <span className={`font-mono text-xs tracking-[0.18em] uppercase ${tone}`}>
      {outcome}
    </span>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] tracking-widest text-white/35 uppercase">
        {label}
      </div>
      <div className="mt-1 text-sm text-white/85 md:text-base">{value}</div>
    </div>
  );
}

function StatusBadge({ launch }: { launch: SpaceLaunch }) {
  const label =
    launch.phase === "liftoff"
      ? "LIFTOFF"
      : launch.phase === "postlaunch"
        ? launch.outcome === "SUCCESS" || launch.outcome === "PARTIAL"
          ? "SUCCESS"
          : launch.outcome === "FAILURE"
            ? "FAILURE"
            : "TELEMETRY"
        : launch.status;

  const isWarm =
    launch.phase !== "countdown" ||
    label === "SUCCESS" ||
    label === "LIFTOFF" ||
    label === "LAUNCHED";

  return (
    <motion.div
      animate={{
        boxShadow: isWarm
          ? "0 0 20px rgba(255, 184, 77, 0.2)"
          : "0 0 20px rgba(85, 214, 255, 0.15)",
      }}
      transition={{ duration: 2, repeat: Infinity, repeatType: "reverse" }}
      className={`rounded border px-3 py-1 font-mono text-xs tracking-widest ${
        isWarm
          ? "border-secondary/40 text-secondary"
          : "border-accent/30 text-accent"
      }`}
    >
      {label}
    </motion.div>
  );
}
