export type DayPart = "morning" | "afternoon" | "evening" | "night";

function dayPartFromHour(hour: number): DayPart {
  if (hour >= 0 && hour < 5) return "night";
  if (hour >= 5 && hour < 12) return "morning";
  if (hour >= 12 && hour < 18) return "afternoon";
  return "evening";
}

export function getLocalHourInTimeZone(date: Date, timeZone: string): number {
  return parseInt(
    new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      hour12: false,
      timeZone,
    }).format(date),
    10
  );
}

export function getLocalHourFromUtcOffset(date: Date, utcOffsetSec: number): number {
  const shifted = new Date(date.getTime() + utcOffsetSec * 1000);
  return shifted.getUTCHours();
}

export function getDayPart(date: Date, timeZone?: string): DayPart {
  const hour = timeZone
    ? getLocalHourInTimeZone(date, timeZone)
    : date.getHours();
  return dayPartFromHour(hour);
}

export function getDayPartFromUtcOffset(date: Date, utcOffsetSec: number): DayPart {
  return dayPartFromHour(getLocalHourFromUtcOffset(date, utcOffsetSec));
}

export function resolveDayPart(
  date: Date,
  options?: { utcOffsetSec?: number }
): DayPart {
  const envTz = process.env.BRIEFING_TZ;
  if (envTz) return getDayPart(date, envTz);
  if (options?.utcOffsetSec !== undefined) {
    return getDayPartFromUtcOffset(date, options.utcOffsetSec);
  }
  return getDayPart(date);
}

export function getDayPartGreeting(userName: string, dayPart: DayPart): string {
  switch (dayPart) {
    case "morning":
      return `Доброе утро, ${userName}.`;
    case "afternoon":
      return `Добрый день, ${userName}.`;
    case "evening":
      return `Добрый вечер, ${userName}.`;
    case "night":
      return `Доброй ночи, ${userName}.`;
  }
}

export function getBriefingTypeLabel(dayPart: DayPart): string {
  switch (dayPart) {
    case "morning":
      return "утреннюю";
    case "afternoon":
      return "дневную";
    case "evening":
      return "вечернюю";
    case "night":
      return "ночную";
  }
}

export function getDayPartLabelRu(dayPart: DayPart): string {
  switch (dayPart) {
    case "morning":
      return "утро";
    case "afternoon":
      return "день";
    case "evening":
      return "вечер";
    case "night":
      return "ночь";
  }
}
