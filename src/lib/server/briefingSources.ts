import type {
  CalendarData,
  GmailData,
  IssTelemetryData,
  SpaceLaunch,
  WeatherData,
  WorldNewsData,
} from "@/types/modules";
import { readFileSync } from "fs";
import { join } from "path";
import { google } from "googleapis";
import {
  buildMonthLabel,
  buildWeekStrip,
  findNextEvent,
  getWeekBounds,
  groupEventsByDay,
  mergeTasksIntoWeek,
} from "@/lib/calendar";
import { fetchDueTasksInRange } from "@/lib/server/googleTasks";
import { aqiLabel } from "@/lib/aqi";
import { formatSunset } from "@/lib/format";
import { buildDailyForecast, getTodayPrecipChance } from "@/lib/weather";
import { fetchCachedSpaceLaunch } from "@/lib/server/spaceSnapshot";
import { logError } from "@/lib/server/logger";
import { rateLimitCooldownMs } from "@/lib/server/upstreamCooldown";
import {
  type DayPart,
  getDayPartGreeting,
  getDayPartLabelRu,
} from "@/lib/daypart";
import {
  ASK_VOICE_RULES,
  BRIEFING_VOICE_RULES,
  buildLaunchBriefingContext,
  dayPartBehaviorRules,
  findTomorrowFirstEventTime,
  isQuietDayPart,
  minutesUntil,
} from "@/lib/briefingContext";

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

  const timezone = forecast.city?.timezone ?? current.timezone ?? 0;
  lastWeatherUtcOffsetSec = timezone;

  const formatLocalTime = (dtSeconds: number) =>
    formatSunset(dtSeconds, timezone);

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
        time: formatLocalTime(item.dt),
        temperature: Math.round(item.main.temp),
        icon: item.weather[0]?.icon ?? "01d",
        precipChance: Math.round((item.pop ?? 0) * 100),
      })
    );

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
    sunrise: formatSunset(current.sys.sunrise, timezone),
    sunset: formatSunset(current.sys.sunset, timezone),
    airQuality,
    hourly,
    daily,
  };
}

const WEATHER_CACHE_TTL_MS = 10 * 60 * 1000;
let weatherCache: { data: WeatherData; expiresAt: number } | null = null;
let lastWeatherUtcOffsetSec: number | undefined;

export function getWeatherUtcOffsetSec(): number | undefined {
  return lastWeatherUtcOffsetSec;
}

export async function resolveWeatherSnapshot(): Promise<SourceResult<WeatherData>> {
  if (!process.env.OPENWEATHER_API_KEY) {
    return { kind: "demo", data: DEMO_WEATHER };
  }

  const now = Date.now();
  if (weatherCache && weatherCache.expiresAt > now) {
    return { kind: "live", data: weatherCache.data };
  }

  try {
    const data = await fetchLiveWeather();
    weatherCache = { data, expiresAt: now + WEATHER_CACHE_TTL_MS };
    return { kind: "live", data };
  } catch (err) {
    logError("briefing.weather", err);
    if (weatherCache) {
      weatherCache.expiresAt =
        Date.now() + rateLimitCooldownMs(err, WEATHER_CACHE_TTL_MS);
      return { kind: "live", data: weatherCache.data };
    }
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

  const weekDays = week.map((day) => dayMap.get(day.dateKey) ?? day);
  const withReminders = mergeTasksIntoWeek(weekDays, [
    {
      id: "demo-reminder-1",
      title: "Call pharmacy",
      due: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 17, 30).toISOString(),
    },
    {
      id: "demo-reminder-2",
      title: "Pick up dry cleaning",
      due: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 10, 0).toISOString(),
    },
  ]);

  return finalizeCalendarWeek(withReminders, now);
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

  let week = groupEventsByDay(response.data.items ?? [], start);
  const tasks = await fetchDueTasksInRange(start, end);
  if (tasks.length > 0) {
    week = mergeTasksIntoWeek(week, tasks);
  }
  return finalizeCalendarWeek(week, now);
}

export async function resolveCalendarSnapshot(): Promise<SourceResult<CalendarData>> {
  if (!isCalendarConfigured()) {
    return { kind: "demo", data: buildDemoCalendarSnapshot() };
  }

  try {
    const data = await fetchLiveCalendar();
    return { kind: "live", data };
  } catch (err) {
    logError("briefing.calendar", err);
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
    const data = await fetchCachedSpaceLaunch();
    return { kind: "live", data };
  } catch (err) {
    logError("briefing.space", err);
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

const DEMO_SPACE: SpaceLaunch = {
  launchId: "demo",
  operator: "Space",
  rocket: "—",
  mission: "Orbital feed offline",
  padName: "—",
  latitude: 0,
  longitude: 0,
  countdown: "T-—",
  status: "TBD",
  launchTime: new Date().toISOString(),
  phase: "countdown",
  outcome: "PENDING",
  detailLines: [],
};

export interface BriefingSourceAvailability {
  weatherAvailable: boolean;
  calendarAvailable: boolean;
  spaceAvailable: boolean;
}

export interface BriefingSources {
  weather: WeatherData;
  calendar: CalendarData;
  space: SpaceLaunch;
}

export interface BriefingSourcesBundle {
  sources: BriefingSources;
  availability: BriefingSourceAvailability;
  weatherUtcOffsetSec?: number;
}

export function buildDemoBriefing(
  weather: WeatherData,
  calendar: CalendarData,
  space: SpaceLaunch,
  userName: string,
  availability: BriefingSourceAvailability,
  dayPart: DayPart
): string {
  const quiet = isQuietDayPart(dayPart);
  const launchCtx = buildLaunchBriefingContext(
    space,
    availability.spaceAvailable
  );
  const parts: string[] = [getDayPartGreeting(userName, dayPart)];

  if (launchCtx.imminent) {
    parts.push(
      "Пуск совсем скоро — имеет смысл заглянуть в Orbital Operations."
    );
  } else if (quiet) {
    const tomorrowTime = availability.calendarAvailable
      ? findTomorrowFirstEventTime(calendar)
      : null;
    if (tomorrowTime) {
      parts.push(
        `Завтра день начнётся в ${tomorrowTime} — можно выспаться.`
      );
    } else {
      parts.push("Срочного ничего — можно спокойно отдыхать.");
    }
  } else if (
    availability.weatherAvailable &&
    weather.precipChance > 50
  ) {
    parts.push(
      "Высокая вероятность осадков — возьми зонт, если выходишь."
    );
  } else if (availability.calendarAvailable && calendar.nextEvent) {
    const mins = minutesUntil(calendar.nextEvent.startIso);
    if (mins != null && mins < 60) {
      parts.push(
        `Через ${mins} мин начнётся встреча — самое время собираться.`
      );
    } else {
      parts.push("День спокойный — сфокусируйся на главном.");
    }
  } else {
    parts.push("На сегодня всё под контролем.");
  }

  return parts.slice(0, quiet ? 2 : 3).join(" ");
}

export function buildBriefingPromptLines(
  sources: BriefingSources,
  availability: BriefingSourceAvailability
): string[] {
  const { weather, calendar, space } = sources;
  const launchCtx = buildLaunchBriefingContext(
    space,
    availability.spaceAvailable
  );
  const lines: string[] = [];

  lines.push(
    "На дашборде уже видны: панель погоды (слева), календарь (справа), Orbital Operations (пуск внизу). Не дублируй их без действия."
  );

  if (availability.weatherAvailable) {
    lines.push(
      `Погода (на панели): ${weather.temperature}°C, ${weather.description}, осадки ${weather.precipChance}%.`
    );
  } else {
    lines.push(
      "Погода: данные временно недоступны — не выдумывай температуру и условия."
    );
  }

  if (availability.calendarAvailable) {
    const tomorrowTime = findTomorrowFirstEventTime(calendar);
    lines.push(
      calendar.nextEvent
        ? `Календарь (на панели): ближайшее ${calendar.nextEvent.time} «${calendar.nextEvent.title}».`
        : "Календарь (на панели): ближайших событий нет."
    );
    if (tomorrowTime) {
      lines.push(
        `Подсказка не на панели: завтра первая встреча в ${tomorrowTime}.`
      );
    }
  } else {
    lines.push("Календарь: данные временно недоступны — не выдумывай встречи.");
  }

  if (availability.spaceAvailable) {
    lines.push(
      `Пуск: ${launchCtx.humanLabel}, фаза ${space.phase}, imminent=${launchCtx.imminent}.`
    );
    if (!launchCtx.shouldMention) {
      lines.push(
        "Пуск далеко — не упоминай или упомяни нейтрально, без срочности."
      );
    }
  } else {
    lines.push(
      "Космос: данные о запусках недоступны — не выдумывай пуски."
    );
  }

  return lines;
}

export function buildClaudeBriefingPrompt(
  userName: string,
  dayPart: DayPart,
  sources: BriefingSources,
  availability: BriefingSourceAvailability
): string {
  const quiet = isQuietDayPart(dayPart);
  return [
    `Ты — Jarvis, лаконичный личный ассистент ${userName}. Сейчас ${getDayPartLabelRu(dayPart)}.`,
    ...BRIEFING_VOICE_RULES,
    ...dayPartBehaviorRules(dayPart),
    quiet
      ? "Сейчас вечер или ночь — максимум 2 предложения."
      : "Утро или день — 1–3 предложения.",
    "Используй только данные доступных источников; если источник недоступен — скажи об этом честно.",
    "",
    ...buildBriefingPromptLines(sources, availability),
  ].join("\n");
}

export interface AskContextExtras {
  briefingText?: string | null;
  iss?: IssTelemetryData | null;
  worldNews?: WorldNewsData | null;
  worldNewsAvailable?: boolean;
  gmail?: GmailData | null;
  gmailAvailable?: boolean;
}

function buildWorldNewsAskLines(
  data: WorldNewsData | null | undefined,
  available: boolean
): string[] {
  if (!available || !data?.headlines.length) {
    return [
      "World News: заголовки временно недоступны — не выдумывай мировые новости.",
    ];
  }

  const block = data.headlines
    .slice(0, 6)
    .map((h) => `[${h.sourceLabel}] ${h.title}`)
    .join(" · ");

  return [
    `World News (один блок контекста): ${block}`,
    "На «что в мире?» / «новости» — 2–3 главные темы по этим заголовкам, без длинного пересказа.",
  ];
}

function buildGmailAskLines(
  data: GmailData | null | undefined,
  available: boolean
): string[] {
  if (!available || !data) {
    return [
      "Почта: данные недоступны — не выдумывай письма и срочность.",
    ];
  }

  if (data.unreadCount === 0) {
    return [
      "Почта: непрочитанных нет.",
      "На «есть что срочное?» — скажи, что срочного ничего.",
    ];
  }

  const previews = data.messages
    .slice(0, 5)
    .map((m) => `«${m.subject}» (${m.from})`)
    .join("; ");

  return [
    `Почта: ${data.unreadCount} непрочитанных в инбоксе. В списке: ${previews}.`,
    "На «есть что срочное?» — оцени по отправителю и теме; назови максимум 1–2 важных, без перечисления всей почты.",
  ];
}

export function buildAskContextLines(
  sources: BriefingSources,
  availability: BriefingSourceAvailability,
  extras?: AskContextExtras
): string[] {
  const lines = buildBriefingPromptLines(sources, availability);

  if (extras?.briefingText) {
    lines.push(
      `Сводка на панели Briefing (уже показана пользователю): «${extras.briefingText}»`,
      "Если спрашивают об общей картине дня — опирайся на эту сводку и не противоречь ей."
    );
  }

  lines.push(
    ...buildWorldNewsAskLines(extras?.worldNews, extras?.worldNewsAvailable ?? false)
  );
  lines.push(
    ...buildGmailAskLines(extras?.gmail, extras?.gmailAvailable ?? false)
  );
  lines.push(...buildIssContextLines(extras?.iss ?? null));

  return lines;
}

function buildIssContextLines(iss: IssTelemetryData | null): string[] {
  if (!iss) {
    return [
      "ISS (футер): телеметрия временно недоступна — не выдумывай положение станции.",
    ];
  }

  const visibility =
    iss.visibility === "eclipsed" ? "в тени Земли" : "на солнечной стороне";

  return [
    `ISS (футер): над ${iss.locationLabel}, ~${Math.round(iss.altitudeKm)} км, ${iss.velocityKms.toFixed(1)} км/с, ${visibility}.`,
    "Если спрашивают про МКС/ISS — отвечай по этим данным.",
  ];
}

export function buildAskSystemPrompt(
  userName: string,
  dayPart: DayPart,
  contextLines: string[]
): string {
  return [
    `Ты — Jarvis, лаконичный личный ассистент ${userName}. Сейчас ${getDayPartLabelRu(dayPart)}.`,
    ...BRIEFING_VOICE_RULES,
    ...ASK_VOICE_RULES,
    ...dayPartBehaviorRules(dayPart),
    "Отвечай коротко, по делу, на русском.",
    "Отвечай на конкретный вопрос; не перечисляй весь дашборд без запроса.",
    "",
    ...contextLines,
  ].join("\n");
}

function pickSourceData<T>(result: SourceResult<T>, fallback: T): T {
  if (result.kind === "unavailable") return fallback;
  return result.data;
}

export async function gatherBriefingSources(): Promise<BriefingSourcesBundle> {
  const [weatherResult, calendarResult, spaceResult] = await Promise.all([
    resolveWeatherSnapshot(),
    resolveCalendarSnapshot(),
    resolveSpaceSnapshot(),
  ]);

  return {
    sources: {
      weather: pickSourceData(weatherResult, DEMO_WEATHER),
      calendar: pickSourceData(calendarResult, buildDemoCalendarSnapshot()),
      space: pickSourceData(spaceResult, DEMO_SPACE),
    },
    availability: {
      weatherAvailable: weatherResult.kind !== "unavailable",
      calendarAvailable: calendarResult.kind !== "unavailable",
      spaceAvailable: spaceResult.kind !== "unavailable",
    },
    weatherUtcOffsetSec:
      weatherResult.kind === "live" ? getWeatherUtcOffsetSec() : undefined,
  };
}
