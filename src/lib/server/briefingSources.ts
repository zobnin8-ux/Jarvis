import type {
  CalendarData,
  SpaceLaunch,
  WeatherData,
} from "@/types/modules";
import type { ExternalServiceId } from "@/types/api";
import { getWeatherDayStatus } from "@/lib/weatherMood";
import { readFileSync } from "fs";
import { join } from "path";
import { google } from "googleapis";
import {
  buildMonthLabel,
  buildWeekStrip,
  findNextEvent,
  getWeekBounds,
  groupEventsByDay,
} from "@/lib/calendar";
import { aqiLabel } from "@/lib/aqi";
import { formatSunset } from "@/lib/format";
import { buildDailyForecast, getTodayPrecipChance } from "@/lib/weather";
import { fetchLiveSpaceLaunch } from "@/lib/server/spaceSnapshot";

export type SourceResult<T> =
  | { kind: "demo"; data: T }
  | { kind: "live"; data: T }
  | { kind: "unavailable" };

const DEMO_WEATHER: WeatherData = {
  temperature: 18,
  feelsLike: 16,
  highToday: 22,
  lowToday: 15,
  precipChance: 25,
  description: "Partly Cloudy",
  icon: "02d",
  humidity: 62,
  windSpeed: 3.4,
  sunrise: "06:12",
  sunset: "20:47",
  airQuality: { aqi: 2, label: "Fair" },
  hourly: [
    { time: "21:00", temperature: 17, icon: "02n", precipChance: 10 },
    { time: "22:00", temperature: 16, icon: "01n", precipChance: 5 },
    { time: "23:00", temperature: 15, icon: "01n", precipChance: 5 },
    { time: "00:00", temperature: 14, icon: "01n", precipChance: 8 },
    { time: "01:00", temperature: 13, icon: "02n", precipChance: 12 },
    { time: "02:00", temperature: 12, icon: "02n", precipChance: 15 },
  ],
  daily: [
    { day: "Today", icon: "02d", high: 22, low: 15, description: "Partly Cloudy" },
    { day: "Tomorrow", icon: "01d", high: 24, low: 16, description: "Clear Sky" },
    { day: "Sat", icon: "10d", high: 20, low: 14, description: "Light Rain" },
  ],
};

function loadServiceAccount(): { client_email: string; private_key: string } | null {
  const jsonPath = process.env.GOOGLE_SERVICE_ACCOUNT_JSON_PATH;
  if (jsonPath) {
    const raw = readFileSync(join(process.cwd(), jsonPath), "utf-8");
    const parsed = JSON.parse(raw) as { client_email: string; private_key: string };
    return { client_email: parsed.client_email, private_key: parsed.private_key };
  }
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (clientEmail && privateKey) {
    return { client_email: clientEmail, private_key: privateKey };
  }
  return null;
}

function isCalendarConfigured(): boolean {
  return Boolean(loadServiceAccount() && process.env.GOOGLE_CALENDAR_ID);
}

async function fetchLiveWeather(): Promise<WeatherData> {
  const apiKey = process.env.OPENWEATHER_API_KEY;
  if (!apiKey) throw new Error("Missing OpenWeather key");

  const lat = process.env.WEATHER_LAT ?? "37.338207";
  const lon = process.env.WEATHER_LON ?? "-121.886330";

  const [currentRes, forecastRes, aqiRes] = await Promise.all([
    fetch(
      `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${apiKey}`,
      { next: { revalidate: 900 } }
    ),
    fetch(
      `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=metric&appid=${apiKey}`,
      { next: { revalidate: 900 } }
    ),
    fetch(
      `https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${apiKey}`,
      { next: { revalidate: 900 } }
    ),
  ]);

  if (!currentRes.ok || !forecastRes.ok) {
    throw new Error(`OpenWeather API error: ${currentRes.status}/${forecastRes.status}`);
  }

  const current = await currentRes.json();
  const forecast = await forecastRes.json();
  const now = Date.now();

  const hourly = forecast.list
    .filter((item: { dt: number }) => item.dt * 1000 > now)
    .slice(0, 6)
    .map(
      (item: {
        dt: number;
        pop?: number;
        main: { temp: number };
        weather: { icon: string }[];
      }) => ({
        time: new Date(item.dt * 1000).toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        }),
        temperature: Math.round(item.main.temp),
        icon: item.weather[0]?.icon ?? "01d",
        precipChance: Math.round((item.pop ?? 0) * 100),
      })
    );

  const timezone = forecast.city?.timezone ?? current.timezone ?? 0;
  const daily = buildDailyForecast(forecast.list, timezone, 3);
  const today = daily.find((d) => d.day === "Today") ?? daily[0];

  let airQuality: WeatherData["airQuality"];
  if (aqiRes.ok) {
    const aqiJson = await aqiRes.json();
    const aqi = aqiJson?.list?.[0]?.main?.aqi as number | undefined;
    if (aqi) airQuality = { aqi, label: aqiLabel(aqi) };
  }

  return {
    temperature: Math.round(current.main.temp),
    feelsLike: Math.round(current.main.feels_like),
    highToday: today?.high ?? Math.round(current.main.temp_max),
    lowToday: today?.low ?? Math.round(current.main.temp_min),
    precipChance: getTodayPrecipChance(forecast.list, timezone),
    description: current.weather[0]?.description
      ? current.weather[0].description.replace(/\b\w/g, (c: string) => c.toUpperCase())
      : "Unknown",
    icon: current.weather[0]?.icon ?? "01d",
    humidity: current.main.humidity,
    windSpeed: current.wind?.speed ?? 0,
    sunrise: formatSunset(current.sys.sunrise, current.timezone),
    sunset: formatSunset(current.sys.sunset, current.timezone),
    airQuality,
    hourly,
    daily,
  };
}

export async function resolveWeatherSnapshot(): Promise<SourceResult<WeatherData>> {
  if (!process.env.OPENWEATHER_API_KEY) {
    return { kind: "demo", data: DEMO_WEATHER };
  }

  try {
    const data = await fetchLiveWeather();
    return { kind: "live", data };
  } catch {
    return { kind: "unavailable" };
  }
}

/** @deprecated Use resolveWeatherSnapshot — kept for internal briefing assembly */
export async function gatherWeatherSnapshot(): Promise<WeatherData> {
  const result = await resolveWeatherSnapshot();
  if (result.kind === "unavailable") return DEMO_WEATHER;
  return result.data;
}

function finalizeCalendarWeek(
  week: ReturnType<typeof groupEventsByDay>,
  now: Date
): CalendarData {
  const eventCounts = new Map<string, number>();
  let totalWeekEvents = 0;
  for (const day of week) {
    eventCounts.set(day.dateKey, day.events.length);
    totalWeekEvents += day.events.length;
  }
  const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const today =
    week.find((day) => day.dateKey === todayKey) ??
    ({ label: "Today", dateKey: todayKey, events: [] } as CalendarData["today"]);

  return {
    monthLabel: buildMonthLabel(now),
    weekStrip: buildWeekStrip(now, eventCounts),
    today,
    week,
    nextEvent: findNextEvent(today.events),
    totalWeekEvents,
  };
}

function buildDemoCalendarSnapshot(): CalendarData {
  const now = new Date();
  const { start: weekStart } = getWeekBounds(now);
  const week = groupEventsByDay([], weekStart);
  const dayMap = new Map(week.map((day) => [day.dateKey, day]));

  const add = (
    dayOffset: number,
    hour: number,
    minute: number,
    title: string,
    category: CalendarData["today"]["events"][0]["category"],
    joinUrl?: string
  ) => {
    const day = new Date(weekStart);
    day.setDate(weekStart.getDate() + dayOffset);
    day.setHours(hour, minute, 0, 0);
    const key = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(day.getDate()).padStart(2, "0")}`;
    dayMap.get(key)?.events.push({
      time: day.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }),
      title,
      isAllDay: false,
      category,
      startIso: day.toISOString(),
      joinUrl,
    });
  };

  add(now.getDay(), 9, 0, "Project Orion Review", "work");
  add(
    now.getDay(),
    11,
    30,
    "Design Sync",
    "call",
    "https://meet.google.com/abc-defg-hij"
  );
  add(now.getDay(), 14, 0, "Weekly Planning", "work");

  return finalizeCalendarWeek(
    week.map((day) => dayMap.get(day.dateKey) ?? day),
    now
  );
}

async function fetchLiveCalendar(): Promise<CalendarData> {
  const credentials = loadServiceAccount();
  const calendarId = process.env.GOOGLE_CALENDAR_ID;
  if (!credentials || !calendarId) {
    throw new Error("Missing Google Calendar credentials");
  }

  const auth = new google.auth.JWT({
    email: credentials.client_email,
    key: credentials.private_key,
    scopes: ["https://www.googleapis.com/auth/calendar.readonly"],
  });
  const calendar = google.calendar({ version: "v3", auth });
  const now = new Date();
  const { start, end } = getWeekBounds(now);

  const response = await calendar.events.list({
    calendarId,
    timeMin: start.toISOString(),
    timeMax: end.toISOString(),
    singleEvents: true,
    orderBy: "startTime",
  });

  const week = groupEventsByDay(response.data.items ?? [], start);
  return finalizeCalendarWeek(week, now);
}

export async function resolveCalendarSnapshot(): Promise<SourceResult<CalendarData>> {
  if (!isCalendarConfigured()) {
    return { kind: "demo", data: buildDemoCalendarSnapshot() };
  }

  try {
    const data = await fetchLiveCalendar();
    return { kind: "live", data };
  } catch {
    return { kind: "unavailable" };
  }
}

export async function gatherCalendarSnapshot(): Promise<CalendarData> {
  const result = await resolveCalendarSnapshot();
  if (result.kind === "unavailable") return buildDemoCalendarSnapshot();
  return result.data;
}

export async function resolveSpaceSnapshot(): Promise<SourceResult<SpaceLaunch>> {
  try {
    const data = await fetchLiveSpaceLaunch();
    return { kind: "live", data };
  } catch {
    return { kind: "unavailable" };
  }
}

export async function gatherSpaceSnapshot(): Promise<SpaceLaunch> {
  const result = await resolveSpaceSnapshot();
  if (result.kind === "unavailable") {
    throw new Error("Space unavailable");
  }
  return result.data;
}

export function buildDemoBriefing(
  weather: WeatherData,
  calendar: CalendarData,
  space: SpaceLaunch,
  userName: string
): string {
  const city = process.env.NEXT_PUBLIC_WEATHER_CITY ?? "San Jose";
  const status = getWeatherDayStatus(weather);
  const next =
    calendar.nextEvent != null
      ? `Next up at ${calendar.nextEvent.time}: ${calendar.nextEvent.title}.`
      : "Your schedule is clear for now.";
  const launch =
    space.phase === "countdown"
      ? `${space.operator} ${space.mission} launches ${space.countdown.replace("T-", "in ")}.`
      : `${space.mission} is in ${space.phase} phase.`;

  return `${userName}, ${city} reads ${status.toLowerCase()} at ${weather.temperature}°. ${next} ${launch}`;
}

export interface BriefingSources {
  weather: WeatherData;
  calendar: CalendarData;
  space: SpaceLaunch;
}

export type BriefingSourcesResult =
  | { ok: true; sources: BriefingSources }
  | { ok: false; service: ExternalServiceId };

function sourceData<T>(result: SourceResult<T>): T | null {
  if (result.kind === "unavailable") return null;
  return result.data;
}

export async function gatherBriefingSources(): Promise<BriefingSourcesResult> {
  const [weatherResult, calendarResult, spaceResult] = await Promise.all([
    resolveWeatherSnapshot(),
    resolveCalendarSnapshot(),
    resolveSpaceSnapshot(),
  ]);

  if (weatherResult.kind === "unavailable") {
    return { ok: false, service: "openweather" };
  }
  if (calendarResult.kind === "unavailable") {
    return { ok: false, service: "google-calendar" };
  }
  if (spaceResult.kind === "unavailable") {
    return { ok: false, service: "spacedevs" };
  }

  const weather = sourceData(weatherResult);
  const calendar = sourceData(calendarResult);
  const space = sourceData(spaceResult);
  if (!weather || !calendar || !space) {
    return { ok: false, service: "spacedevs" };
  }

  return { ok: true, sources: { weather, calendar, space } };
}
