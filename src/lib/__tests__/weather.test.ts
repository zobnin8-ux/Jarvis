import { describe, expect, it, vi } from "vitest";
import { buildDailyForecast, getTodayPrecipChance } from "@/lib/weather";

const TZ = -7 * 3600;

describe("getTodayPrecipChance", () => {
  it("returns max pop for today in local timezone", () => {
    const nowSec = Math.floor(new Date("2026-06-11T18:00:00Z").getTime() / 1000);
    const items = [
      { dt: nowSec + 3600, pop: 0.1 },
      { dt: nowSec + 7200, pop: 0.45 },
      { dt: nowSec + 86_400, pop: 0.9 },
    ];

    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-11T18:00:00Z"));
    expect(getTodayPrecipChance(items, TZ)).toBe(45);
    vi.useRealTimers();
  });
});

describe("buildDailyForecast", () => {
  it("builds up to N daily buckets with Today label", () => {
    const base = Math.floor(new Date("2026-06-11T12:00:00Z").getTime() / 1000);
    const items = [
      {
        dt: base,
        main: { temp: 20, temp_min: 18, temp_max: 22 },
        weather: [{ icon: "01d", description: "clear sky" }],
      },
      {
        dt: base + 86_400,
        main: { temp: 19, temp_min: 17, temp_max: 21 },
        weather: [{ icon: "02d", description: "few clouds" }],
      },
    ];

    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-11T12:00:00Z"));
    const daily = buildDailyForecast(items, TZ, 2);
    expect(daily).toHaveLength(2);
    expect(daily[0].day).toBe("Today");
    expect(daily[0].high).toBeGreaterThanOrEqual(daily[0].low);
    vi.useRealTimers();
  });
});
