import type {
  CalendarDay,
  CalendarEvent,
  CalendarEventCategory,
  CalendarNextEvent,
  CalendarWeekDay,
} from "@/types/modules";

export function inferEventCategory(title: string): CalendarEventCategory {
  const lower = title.toLowerCase();

  if (
    /\b(call|zoom|teams|meet|meeting|sync|standup|stand-up|huddle|interview|1:1|1-1)\b/.test(
      lower
    )
  ) {
    return "call";
  }

  if (
    /\b(gym|workout|dinner|lunch|personal|birthday|doctor|dentist|vacation|holiday|barber|haircut)\b/.test(
      lower
    )
  ) {
    return "personal";
  }

  if (
    /\b(review|planning|project|design|dev|work|office|client|demo|presentation|workshop|training)\b/.test(
      lower
    )
  ) {
    return "work";
  }

  return "other";
}

export function categoryLabel(category: CalendarEventCategory): string | null {
  switch (category) {
    case "work":
      return "Work";
    case "call":
      return "Call";
    case "personal":
      return "Personal";
    default:
      return null;
  }
}

const JOIN_PATTERNS = [
  /https:\/\/[\w.-]*zoom\.us\/[^\s<"]+/i,
  /https:\/\/meet\.google\.com\/[^\s<"]+/i,
  /https:\/\/teams\.microsoft\.com\/[^\s<"]+/i,
];

export function extractJoinUrl(
  ...sources: (string | null | undefined)[]
): string | undefined {
  for (const source of sources) {
    if (!source) continue;
    for (const pattern of JOIN_PATTERNS) {
      const match = source.match(pattern);
      if (match) return match[0];
    }
  }
  return undefined;
}

export function formatMinutesUntil(iso: string): string | null {
  const deltaMs = new Date(iso).getTime() - Date.now();
  if (deltaMs <= 0) return null;
  const minutes = Math.round(deltaMs / 60_000);
  if (minutes < 60) return `in ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder > 0 ? `in ${hours}h ${remainder}m` : `in ${hours}h`;
}

function dateKeyFromDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function startOfWeekSunday(date: Date): Date {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - start.getDay());
  return start;
}

export function buildMonthLabel(date: Date): string {
  return date
    .toLocaleDateString("en-US", { month: "long", year: "numeric" })
    .toUpperCase();
}

export function buildWeekStrip(
  reference: Date,
  eventCounts: Map<string, number>
): CalendarWeekDay[] {
  const weekStart = startOfWeekSunday(reference);
  const letters = ["S", "M", "T", "W", "T", "F", "S"];
  const todayKey = dateKeyFromDate(reference);

  return Array.from({ length: 7 }, (_, index) => {
    const day = new Date(weekStart);
    day.setDate(weekStart.getDate() + index);
    const key = dateKeyFromDate(day);

    return {
      dateKey: key,
      weekdayLetter: letters[index],
      dayNumber: day.getDate(),
      isToday: key === todayKey,
      hasEvents: (eventCounts.get(key) ?? 0) > 0,
    };
  });
}

export function formatDayLabel(dateKey: string, todayKey: string): string {
  if (dateKey === todayKey) return "Today";

  const today = parseDateKey(todayKey);
  const target = parseDateKey(dateKey);
  const diffDays = Math.round(
    (target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (diffDays === 1) return "Tomorrow";

  return target.toLocaleDateString("en-US", { weekday: "short" });
}

function parseDateKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function findNextEvent(events: CalendarEvent[]): CalendarNextEvent | null {
  const now = Date.now();

  const upcoming = events
    .filter((event) => !event.isAllDay && new Date(event.startIso).getTime() > now)
    .sort(
      (a, b) =>
        new Date(a.startIso).getTime() - new Date(b.startIso).getTime()
    );

  const next = upcoming[0];
  if (!next) return null;

  return {
    time: next.time,
    title: next.title,
    category: next.category,
    startIso: next.startIso,
    location: next.location,
    joinUrl: next.joinUrl,
  };
}

export function getWeekBounds(reference: Date): { start: Date; end: Date } {
  const start = startOfWeekSunday(reference);
  const end = new Date(start);
  end.setDate(start.getDate() + 7);
  return { start, end };
}

export function groupEventsByDay(
  items: {
    summary?: string | null;
    location?: string | null;
    description?: string | null;
    hangoutLink?: string | null;
    conferenceData?: {
      entryPoints?: { uri?: string | null; entryPointType?: string | null }[];
    } | null;
    start?: { dateTime?: string | null; date?: string | null };
  }[],
  weekStart: Date
): CalendarDay[] {
  const todayKey = dateKeyFromDate(new Date());
  const days: CalendarDay[] = [];

  for (let i = 0; i < 7; i++) {
    const day = new Date(weekStart);
    day.setDate(weekStart.getDate() + i);
    const key = dateKeyFromDate(day);
    days.push({
      label: formatDayLabel(key, todayKey),
      dateKey: key,
      events: [],
    });
  }

  const dayMap = new Map(days.map((day) => [day.dateKey, day]));

  for (const item of items) {
    const isAllDay = Boolean(item.start?.date && !item.start?.dateTime);
    const startRaw = item.start?.dateTime ?? item.start?.date ?? "";
    if (!startRaw) continue;

    const startDate = new Date(startRaw);
    const key = isAllDay
      ? startRaw.slice(0, 10)
      : dateKeyFromDate(startDate);

    const bucket = dayMap.get(key);
    if (!bucket) continue;

    const conferenceUri = item.conferenceData?.entryPoints?.find(
      (entry) => entry.entryPointType === "video"
    )?.uri;

    bucket.events.push({
      time: isAllDay
        ? "All day"
        : startDate.toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
          }),
      title: item.summary ?? "Untitled",
      isAllDay,
      category: inferEventCategory(item.summary ?? ""),
      startIso: isAllDay ? `${key}T00:00:00` : startDate.toISOString(),
      location: item.location?.trim() || undefined,
      joinUrl: extractJoinUrl(
        item.hangoutLink,
        conferenceUri,
        item.description,
        item.location
      ),
    });
  }

  for (const day of days) {
    day.events.sort((a, b) => {
      if (a.isAllDay && !b.isAllDay) return -1;
      if (!a.isAllDay && b.isAllDay) return 1;
      return new Date(a.startIso).getTime() - new Date(b.startIso).getTime();
    });
  }

  return days;
}
