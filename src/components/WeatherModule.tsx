"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useMemo, useState } from "react";
import { WeatherHudIcon } from "@/components/WeatherHudIcon";
import { Panel } from "@/components/ui/Panel";
import { ServiceUnavailablePanel } from "@/components/ui/ServiceUnavailablePanel";
import { useIntervalFetch } from "@/hooks/useIntervalFetch";
import { fetchWeather } from "@/services/weatherService";
import { getModuleConfig } from "@/lib/moduleRegistry";
import {
  getWeatherDayStatus,
  getWeatherPoetryLine,
  resolveWeatherMood,
} from "@/lib/weatherMood";

const WEATHER_LOCATION = (
  process.env.NEXT_PUBLIC_WEATHER_CITY ?? "San Jose"
).toUpperCase();

export function WeatherModule() {
  const [telemetryOpen, setTelemetryOpen] = useState(false);
  const config = getModuleConfig("weather");
  const fetcher = useCallback(() => fetchWeather(), []);
  const { data, loading, unavailableService } = useIntervalFetch({
    fetcher,
    interval: config?.refreshInterval ?? 900000,
    cacheKey: "jarvis-cache-weather",
    healthId: "weather",
  });

  const mood = useMemo(
    () => (data ? resolveWeatherMood(data) : "cloudy"),
    [data]
  );
  const dayStatus = useMemo(
    () => (data ? getWeatherDayStatus(data) : null),
    [data]
  );
  const poetry = useMemo(
    () => (data ? getWeatherPoetryLine(mood, data) : null),
    [data, mood]
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
          <>
            <section className="weather-hero" aria-label="Current conditions">
              <div className="weather-hero-head">
                <div className="weather-location">{WEATHER_LOCATION}</div>
                {dayStatus && (
                  <div className="weather-day-status">{dayStatus}</div>
                )}
              </div>

              <div className="weather-icon-wrap">
                <WeatherHudIcon icon={data.icon} mood={mood} size="hero" />
              </div>

              <div className="weather-hero-core">
                <div className="weather-temp">{data.temperature}°</div>
                <div className="weather-desc">{data.description}</div>
              </div>
            </section>

            <div className="weather-footer">
              <button
                type="button"
                className="weather-telemetry-toggle"
                onClick={() => setTelemetryOpen((open) => !open)}
                aria-expanded={telemetryOpen}
              >
                <span
                  className={`weather-telemetry-chevron${telemetryOpen ? " is-open" : ""}`}
                  aria-hidden
                >
                  ▸
                </span>
                Atmospheric Data
              </button>

              <AnimatePresence initial={false}>
                {telemetryOpen && (
                  <motion.section
                    key="telemetry"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.32, ease: [0.25, 0.1, 0.25, 1] }}
                    className="weather-telemetry overflow-hidden"
                    aria-label="Forecast details"
                  >
                    {poetry && (
                      <p className="weather-poetry weather-poetry--telemetry">
                        {poetry}
                      </p>
                    )}

                    <div className="weather-metrics">
                      <Metric label="High" value={`${data.highToday}°`} />
                      <Metric label="Low" value={`${data.lowToday}°`} />
                      <Metric label="Feels" value={`${data.feelsLike}°`} />
                      <Metric label="Humidity" value={`${data.humidity}%`} />
                      <Metric label="Wind" value={`${data.windSpeed} m/s`} />
                      <Metric label="Precip" value={`${data.precipChance}%`} />
                      <Metric label="Sunrise" value={data.sunrise} />
                      <Metric label="Sunset" value={data.sunset} />
                      {data.airQuality && (
                        <Metric
                          label="AQI"
                          value={`${data.airQuality.aqi} · ${data.airQuality.label}`}
                        />
                      )}
                    </div>

                    <div className="weather-block">
                      <div className="weather-block-label">Precip Timeline</div>
                      <div className="weather-precip-timeline">
                        {data.hourly.map((hour) => (
                          <div key={hour.time} className="weather-precip-item">
                            <div className="weather-precip-time">{hour.time}</div>
                            <div className="weather-precip-bar-wrap">
                              <div
                                className="weather-precip-bar"
                                style={{ height: `${Math.max(4, hour.precipChance)}%` }}
                              />
                            </div>
                            <div className="weather-precip-pct">
                              {hour.precipChance}%
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="weather-block">
                      <div className="weather-block-label">Next 6 Hours</div>
                      <div className="weather-hourly">
                        {data.hourly.map((hour) => (
                          <div key={hour.time} className="weather-hourly-item">
                            <div className="weather-hourly-time">{hour.time}</div>
                            <WeatherHudIcon icon={hour.icon} size="sm" />
                            <div className="weather-hourly-temp">
                              {hour.temperature}°
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="weather-block">
                      <div className="weather-block-label">3-Day Outlook</div>
                      <div className="weather-daily">
                        {data.daily.map((day) => (
                          <div key={day.day} className="weather-daily-row">
                            <div className="weather-daily-day">{day.day}</div>
                            <WeatherHudIcon icon={day.icon} size="sm" />
                            <div className="weather-daily-desc">
                              {day.description}
                            </div>
                            <div className="weather-daily-temps">
                              <span className="weather-daily-high">
                                {day.high}°
                              </span>
                              <span className="weather-daily-sep">·</span>
                              <span className="weather-daily-low">
                                {day.low}°
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </motion.section>
                )}
              </AnimatePresence>
            </div>
          </>
        ) : null}
      </div>
    </Panel>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="weather-metric">
      <span className="weather-metric-label">{label}</span>
      <span className="weather-metric-value">{value}</span>
    </div>
  );
}
