import type { DailyForecast } from "@/types/modules";

interface ForecastItem {
  dt: number;
  main: { temp: number; temp_min: number; temp_max: number };
  weather: { icon: string; description: string }[];
}

function localDateKey(dtSeconds: number, timezoneOffset: number): string {
  const date = new Date((dtSeconds + timezoneOffset) * 1000);
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function localHour(dtSeconds: number, timezoneOffset: number): number {
  return new Date((dtSeconds + timezoneOffset) * 1000).getUTCHours();
}

function formatDayLabel(dateKey: string, todayKey: string, timezoneOffset: number): string {
  if (dateKey === todayKey) return "Today";

  const today = parseDateKey(todayKey);
  const target = parseDateKey(dateKey);
  const diffDays = Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 1) return "Tomorrow";

  const weekday = new Date((target.getTime() / 1000 + timezoneOffset) * 1000);
  return weekday.toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" });
}

function parseDateKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export function getTodayPrecipChance(
  items: { dt: number; pop?: number }[],
  timezoneOffset: number
): number {
  const now = Math.floor(Date.now() / 1000);
  const todayKey = localDateKey(now, timezoneOffset);
  let maxPop = 0;

  for (const item of items) {
    if (localDateKey(item.dt, timezoneOffset) !== todayKey) continue;
    maxPop = Math.max(maxPop, item.pop ?? 0);
  }

  return Math.round(maxPop * 100);
}

export function buildDailyForecast(
  items: ForecastItem[],
  timezoneOffset: number,
  days = 3
): DailyForecast[] {
  const now = Math.floor(Date.now() / 1000);
  const todayKey = localDateKey(now, timezoneOffset);
  const grouped = new Map<string, ForecastItem[]>();

  for (const item of items) {
    const key = localDateKey(item.dt, timezoneOffset);
    if (key < todayKey) continue;

    const bucket = grouped.get(key) ?? [];
    bucket.push(item);
    grouped.set(key, bucket);
  }

  const sortedKeys = [...grouped.keys()].sort().slice(0, days);

  return sortedKeys.map((dateKey) => {
    const dayItems = grouped.get(dateKey) ?? [];
    let low = Infinity;
    let high = -Infinity;

    for (const item of dayItems) {
      low = Math.min(low, item.main.temp_min, item.main.temp);
      high = Math.max(high, item.main.temp_max, item.main.temp);
    }

    const noonItem =
      dayItems.reduce<(typeof dayItems)[0] | null>((best, item) => {
        if (!best) return item;
        const bestDist = Math.abs(localHour(best.dt, timezoneOffset) - 12);
        const itemDist = Math.abs(localHour(item.dt, timezoneOffset) - 12);
        return itemDist < bestDist ? item : best;
      }, null) ?? dayItems[0];

    const weather = noonItem?.weather[0];

    return {
      day: formatDayLabel(dateKey, todayKey, timezoneOffset),
      icon: weather?.icon ?? "01d",
      high: Math.round(high),
      low: Math.round(low),
      description: weather?.description
        ? weather.description.replace(/\b\w/g, (c) => c.toUpperCase())
        : "Unknown",
    };
  });
}
