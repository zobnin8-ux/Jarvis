"use client";

import type { DeviceLocationSource } from "@/context/DeviceLocationContext";

interface WeatherLocationHeadProps {
  label: string;
  source: DeviceLocationSource;
  dayStatus?: string | null;
  compact?: boolean;
}

export function WeatherLocationHead({
  label,
  source,
  dayStatus,
  compact = false,
}: WeatherLocationHeadProps) {
  return (
    <div className={`weather-hero-head${compact ? " weather-hero-head--compact" : ""}`}>
      <div className="weather-location-row">
        <div className="weather-location">{label}</div>
        {source === "live" && (
          <span className="weather-location-badge weather-location-badge--live">
            ЗДЕСЬ
          </span>
        )}
        {source === "fallback" && (
          <span className="weather-location-badge weather-location-badge--home">
            HOME
          </span>
        )}
      </div>
      {dayStatus && <div className="weather-day-status">{dayStatus}</div>}
    </div>
  );
}
