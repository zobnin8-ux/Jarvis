"use client";

import { useCallback, useMemo } from "react";
import { WeatherHudIcon } from "@/components/WeatherHudIcon";
import { WeatherRailIcon, type WeatherRailIconId } from "@/components/WeatherRailIcon";
import { Panel } from "@/components/ui/Panel";
import { ServiceUnavailablePanel } from "@/components/ui/ServiceUnavailablePanel";
import { useAdaptivePoll } from "@/hooks/useAdaptivePoll";
import { useIntervalFetch } from "@/hooks/useIntervalFetch";
import { fetchWeather } from "@/services/weatherService";
import { getModuleConfig } from "@/lib/moduleRegistry";
import { getWeatherDayStatus, resolveWeatherMood } from "@/lib/weatherMood";
import { formatTime12h } from "@/lib/format";

const WEATHER_LOCATION = (
  process.env.NEXT_PUBLIC_WEATHER_CITY ?? "San Jose"
).toUpperCase();

export function WeatherModule() {
  const config = getModuleConfig("weather");
  const fetcher = useCallback(() => fetchWeather(), []);
  const dayInterval = config?.refreshInterval ?? 900000;
  const poll = useAdaptivePoll("weather", dayInterval);
  const { data, loading, unavailableService } = useIntervalFetch({
    fetcher,
    interval: poll.intervalMs,
    paused: poll.paused,
    cacheKey: "jarvis-cache-v2-weather",
    healthId: "weather",
  });

  const mood = useMemo(
    () =>
      data
        ? resolveWeatherMood({
            icon: data.icon ?? "01d",
            sunset: data.sunset ?? "20:00",
          })
        : "cloudy",
    [data]
  );
  const dayStatus = useMemo(
    () => (data ? getWeatherDayStatus(data) : null),
    [data]
  );

  return (
    <Panel
      className={`weather-panel weather-mood--${mood} w-full self-start overflow-hidden p-4 md:p-5`}
      delay={0.1}
    >
      <div className="weather-atmosphere" aria-hidden />
      <div className="weather-fx" aria-hidden />
      <div className="weather-atmosphere-edge" aria-hidden />

      <div className="relative z-[1] flex flex-col gap-3">
        {unavailableService ? (
          <ServiceUnavailablePanel service={unavailableService} />
        ) : loading && !data ? (
          <div className="text-sm text-white/30">Acquiring telemetry...</div>
        ) : data ? (
          <section className="weather-hero" aria-label="Current conditions">
            <div className="weather-hero-head">
              <div className="weather-location">{WEATHER_LOCATION}</div>
              {dayStatus && (
                <div className="weather-day-status">{dayStatus}</div>
              )}
            </div>

            <div className="weather-hero-body">
              <div
                className="weather-hero-rail weather-hero-rail--left"
                aria-label="Temperature range"
              >
                <RailMetric icon="high" label="High" value={`${data.highToday}°`} />
                <RailMetric icon="low" label="Low" value={`${data.lowToday}°`} />
                <RailMetric icon="feels" label="Feels" value={`${data.feelsLike}°`} />
                <RailMetric
                  icon="sunrise"
                  label="Rise"
                  value={formatTime12h(data.sunrise)}
                />
              </div>

              <div className="weather-hero-center">
                <div className="weather-icon-wrap">
                  <WeatherHudIcon icon={data.icon} mood={mood} size="hero" />
                </div>
                <div className="weather-hero-core">
                  <div className="weather-temp">{data.temperature}°</div>
                  <div className="weather-desc">{data.description}</div>
                </div>
              </div>

              <div
                className="weather-hero-rail weather-hero-rail--right"
                aria-label="Atmospheric data"
              >
                <RailMetric icon="humid" label="Humid" value={`${data.humidity}%`} />
                <RailMetric
                  icon="wind"
                  label="Wind"
                  value={`${data.windSpeed.toFixed(1)} m/s`}
                />
                <RailMetric icon="precip" label="Precip" value={`${data.precipChance}%`} />
                {data.airQuality && (
                  <RailMetric
                    icon="aqi"
                    label="AQI"
                    value={String(data.airQuality.aqi)}
                    title={data.airQuality.label}
                  />
                )}
                <RailMetric
                  icon="sunset"
                  label="Set"
                  value={formatTime12h(data.sunset)}
                />
              </div>
            </div>
          </section>
        ) : null}
      </div>
    </Panel>
  );
}

function RailMetric({
  icon,
  label,
  value,
  title,
}: {
  icon: WeatherRailIconId;
  label: string;
  value: string;
  title?: string;
}) {
  return (
    <div className="weather-rail-metric">
      <WeatherRailIcon id={icon} />
      <div className="weather-rail-text" title={title}>
        <span className="weather-rail-line">
          <span className="weather-rail-label">{label}</span>
          <span className="weather-rail-value">{value}</span>
        </span>
      </div>
    </div>
  );
}
