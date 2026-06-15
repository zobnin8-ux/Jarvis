import { getLocalHourInTimeZone } from "@/lib/daypart";

/** Night window [start, end): e.g. 23→7 = night from 23:00 through 06:59. */
export function isNightHour(
  hour: number,
  startHour: number,
  endHour: number
): boolean {
  if (startHour === endHour) return false;
  if (startHour < endHour) {
    return hour >= startHour && hour < endHour;
  }
  return hour >= startHour || hour < endHour;
}

export function isNightBySchedule(
  date: Date,
  options: {
    timeZone: string;
    startHour: number;
    endHour: number;
  }
): boolean {
  const hour = getLocalHourInTimeZone(date, options.timeZone);
  return isNightHour(hour, options.startHour, options.endHour);
}

export function msUntilNextScheduleBoundary(
  date: Date,
  options: {
    timeZone: string;
    startHour: number;
    endHour: number;
  }
): number {
  const { timeZone, startHour, endHour } = options;
  const currentlyNight = isNightBySchedule(date, options);

  for (let step = 1; step <= 24 * 60; step++) {
    const probe = new Date(date.getTime() + step * 60_000);
    const hour = getLocalHourInTimeZone(probe, timeZone);
    const minute = parseInt(
      new Intl.DateTimeFormat("en-US", {
        minute: "numeric",
        timeZone,
      }).format(probe),
      10
    );
    if (minute !== 0) continue;
    const night = isNightHour(hour, startHour, endHour);
    if (night !== currentlyNight) {
      return step * 60_000;
    }
  }

  return 60_000;
}
