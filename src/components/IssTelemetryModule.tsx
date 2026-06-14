"use client";

import { useCallback, useEffect, useState } from "react";
import { useAdaptivePoll } from "@/hooks/useAdaptivePoll";
import { useIntervalFetch } from "@/hooks/useIntervalFetch";
import { fetchIssTelemetry } from "@/services/issTelemetryService";
import type { IssTelemetryData } from "@/types/modules";

const DAY_POLL_MS = 15_000;

function formatCoord(value: number, axis: "lat" | "lon"): string {
  const abs = Math.abs(value).toFixed(2);
  const hemi = axis === "lat" ? (value >= 0 ? "N" : "S") : value >= 0 ? "E" : "W";
  return `${abs}°${hemi}`;
}

function dataAgeSec(updatedAt: string): number {
  const ms = Date.now() - new Date(updatedAt).getTime();
  return Math.max(0, Math.round(ms / 1000));
}

export function IssTelemetryModule() {
  const fetcher = useCallback(() => fetchIssTelemetry(), []);
  const poll = useAdaptivePoll("iss", DAY_POLL_MS);
  const { data } = useIntervalFetch({
    fetcher,
    interval: poll.intervalMs,
    paused: poll.paused,
    cacheKey: "jarvis-cache-v2-iss-telemetry",
  });

  if (!data) return null;

  return <IssTelemetryPanel data={data} />;
}

function IssTelemetryPanel({ data }: { data: IssTelemetryData }) {
  const [ageSec, setAgeSec] = useState(() => dataAgeSec(data.updatedAt));

  useEffect(() => {
    setAgeSec(dataAgeSec(data.updatedAt));
    const id = window.setInterval(() => {
      setAgeSec(dataAgeSec(data.updatedAt));
    }, 1000);
    return () => window.clearInterval(id);
  }, [data.updatedAt]);

  const speedPct = Math.min(
    100,
    (data.velocityKms / data.maxVelocityKms) * 100
  );
  const isSunlit = data.visibility === "daylight";
  const orbitPct = data.orbitProgressPct ?? 0;
  const orbitNum = data.orbitNumberToday;

  return (
    <div className="iss-telemetry" aria-label="ISS live telemetry">
      <div className="iss-telemetry-head">
        <div className="iss-telemetry-live">
          <span className="iss-telemetry-live-dot" aria-hidden />
          <span>LIVE POSITION</span>
        </div>
        <span className="iss-telemetry-id">LEO · NORAD {data.noradId}</span>
        <span
          className={`iss-telemetry-badge${isSunlit ? " iss-telemetry-badge--sun" : ""}`}
        >
          {isSunlit ? "SUNLIT" : "ECLIPSE"}
        </span>
      </div>

      <div className="iss-telemetry-place">{data.locationLabel}</div>

      <div className="iss-telemetry-sub">
        {formatCoord(data.latitude, "lat")} · {formatCoord(data.longitude, "lon")}{" "}
        · Alt {data.altitudeKm.toFixed(1)} km
      </div>

      <div className="iss-telemetry-speed-bar" aria-hidden>
        <div
          className="iss-telemetry-speed-fill"
          style={{ width: `${speedPct}%` }}
        />
        <span className="iss-telemetry-speed-min">0 km/s</span>
        <span className="iss-telemetry-speed-max">
          {data.maxVelocityKms.toFixed(1)} km/s
        </span>
      </div>

      <div className="iss-telemetry-grid">
        <Metric label="Altitude (km)" value={data.altitudeKm.toFixed(1)} />
        <Metric label="Speed (km/s)" value={data.velocityKms.toFixed(2)} />
        <Metric label="Latitude" value={formatCoord(data.latitude, "lat")} />
        <Metric label="Longitude" value={formatCoord(data.longitude, "lon")} />
      </div>

      <div className="iss-telemetry-foot">
        {orbitNum != null && (
          <div className="iss-telemetry-orbit">
            <OrbitRing pct={orbitPct} />
            <div className="iss-telemetry-orbit-text">
              <span>
                Orbit <strong>{orbitNum}</strong> today ·{" "}
                <strong>{orbitPct}%</strong> complete
              </span>
            </div>
          </div>
        )}
        <span className="iss-telemetry-age">Data · {ageSec.toFixed(1)}s ago</span>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="iss-telemetry-metric">
      <div className="iss-telemetry-metric-value">{value}</div>
      <div className="iss-telemetry-metric-label">{label}</div>
    </div>
  );
}

function OrbitRing({ pct }: { pct: number }) {
  const r = 14;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - pct / 100);

  return (
    <svg
      className="iss-telemetry-orbit-ring"
      width="36"
      height="36"
      viewBox="0 0 36 36"
      aria-hidden
    >
      <circle
        cx="18"
        cy="18"
        r={r}
        fill="none"
        stroke="rgba(85, 214, 255, 0.12)"
        strokeWidth="3"
      />
      <circle
        cx="18"
        cy="18"
        r={r}
        fill="none"
        stroke="rgba(120, 255, 180, 0.85)"
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={offset}
        transform="rotate(-90 18 18)"
      />
    </svg>
  );
}
