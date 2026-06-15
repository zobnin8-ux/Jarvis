import type { CalendarData, SpaceLaunch } from "@/types/modules";
import type { DayPart } from "@/lib/daypart";

const TWO_HOURS_MS = 2 * 60 * 60 * 1000;

export interface LaunchBriefingContext {
  humanLabel: string;
  imminent: boolean;
  shouldMention: boolean;
}

export function buildLaunchBriefingContext(
  space: SpaceLaunch,
  available: boolean
): LaunchBriefingContext {
  if (!available || space.launchId === "demo") {
    return {
      humanLabel: "данные о пусках недоступны",
      imminent: false,
      shouldMention: false,
    };
  }

  const launchMs = new Date(space.launchTime).getTime();
  const now = Date.now();
  const diffMs = launchMs - now;
  const imminent =
    space.phase === "liftoff" ||
    (diffMs > 0 && diffMs < TWO_HOURS_MS);

  if (space.phase === "postlaunch") {
    return {
      humanLabel: "пуск недавно завершён",
      imminent: false,
      shouldMention: false,
    };
  }

  if (Number.isNaN(launchMs) || diffMs <= 0) {
    return {
      humanLabel: "нет ближайшего пуска в манифесте",
      imminent: false,
      shouldMention: false,
    };
  }

  const hours = Math.max(1, Math.round(diffMs / (60 * 60 * 1000)));
  const launchDate = new Date(launchMs);
  const timeStr = launchDate.toLocaleTimeString("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  let dayWord: string;
  if (launchDate.toDateString() === today.toDateString()) {
    dayWord = "сегодня";
  } else if (launchDate.toDateString() === tomorrow.toDateString()) {
    dayWord = "завтра";
  } else {
    dayWord = launchDate.toLocaleDateString("ru-RU", { weekday: "long" });
  }

  return {
    humanLabel: `пуск ${dayWord} ~${timeStr} (через ~${hours} ч)`,
    imminent,
    shouldMention: imminent,
  };
}

export function minutesUntil(iso: string): number | null {
  const diff = new Date(iso).getTime() - Date.now();
  if (diff <= 0) return null;
  return Math.round(diff / 60_000);
}

export function findTomorrowFirstEventTime(
  calendar: CalendarData
): string | null {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const key = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, "0")}-${String(tomorrow.getDate()).padStart(2, "0")}`;

  const day =
    calendar.week.find((d) => d.dateKey === key) ??
    (calendar.today.dateKey === key ? calendar.today : null);

  if (!day) return null;

  const timed = day.events
    .filter((e) => !e.isAllDay)
    .sort(
      (a, b) =>
        new Date(a.startIso).getTime() - new Date(b.startIso).getTime()
    );

  return timed[0]?.time ?? null;
}

export function isQuietDayPart(dayPart: DayPart): boolean {
  return dayPart === "night" || dayPart === "evening";
}

export const BRIEFING_VOICE_RULES = [
  "Ответ — простой текст на русском. БЕЗ markdown: без #, без *, без списков и заголовков.",
  "1–3 предложения; ночью и вечером — не больше 2.",
  "НЕ пересказывай факты, уже видимые на дашборде (температуру, название и время встречи, название пуска) только ради повтора.",
  "Дай слой смысла: приоритет/действие на сейчас, одна подсказка которой нет на панелях, или честно «срочного ничего».",
  "Факт с панели упоминай ТОЛЬКО если есть действие к нему.",
  "Не придумывай срочность. «Финальный отсчёт» и «вот-вот старт» — только если imminent=true.",
  "Советы про выход, одежду и зонт — только утром и днём, не ночью и не вечером.",
] as const;

/** Extra rules for `/api/ask` — short answers on simple voice commands. */
export const ASK_VOICE_RULES = [
  "Короткие команды — строго 1–2 предложения, без вступлений.",
  "«Какая погода» / «погода» — температура и условие одной фразой; советы только если явно спросили.",
  "«Включи радио» / «выключи радио» — одно короткое предложение; команда выполняется системой на клиенте.",
  "«Есть что срочное?» — да/нет и максимум 1–2 темы из блока почты; не перечисляй весь инбокс.",
  "«Что в мире?» / «новости» — 2–3 главные темы из блока World News, без длинного обзора.",
] as const;

export function dayPartBehaviorRules(dayPart: DayPart): string[] {
  if (dayPart === "night" || dayPart === "evening") {
    return [
      "Сейчас ночь или вечер: коротко и спокойно.",
      "БЕЗ советов «на выход», «зонт», «одежда».",
      "Можно упомянуть, что завтра (время первой встречи), если это полезно и не дублирует панель.",
    ];
  }
  return [
    "Утро или день: советы про выход/одежду/зонт уместны, если осадки или холод.",
  ];
}
