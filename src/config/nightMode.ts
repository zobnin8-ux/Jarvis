export type NightPollModuleId =
  | "iss"
  | "weather"
  | "calendar"
  | "gmail"
  | "briefing"
  | "space"
  | "worldNews"
  | "nasa"
  | "sv"
  | "audiobooks";

export type NightModePreference = "auto" | "day" | "night";

/** @deprecated Legacy boolean storage — migrated to {@link NIGHT_MODE_PREFERENCE_KEY}. */
export const NIGHT_MODE_STORAGE_KEY = "jarvis-night-mode";

export const NIGHT_MODE_PREFERENCE_KEY = "jarvis-night-mode-preference";

export const DEFAULT_NIGHT_START_HOUR = 23;
export const DEFAULT_NIGHT_END_HOUR = 7;

export function readNightScheduleConfig(): {
  startHour: number;
  endHour: number;
  timeZone: string;
} {
  const startHour = parseScheduleHour(
    process.env.NEXT_PUBLIC_NIGHT_START_HOUR,
    DEFAULT_NIGHT_START_HOUR
  );
  const endHour = parseScheduleHour(
    process.env.NEXT_PUBLIC_NIGHT_END_HOUR,
    DEFAULT_NIGHT_END_HOUR
  );
  const timeZone =
    process.env.NEXT_PUBLIC_NIGHT_TZ?.trim() ||
    (typeof Intl !== "undefined"
      ? Intl.DateTimeFormat().resolvedOptions().timeZone
      : "UTC");

  return { startHour, endHour, timeZone };
}

function parseScheduleHour(raw: string | undefined, fallback: number): number {
  if (!raw) return fallback;
  const n = parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 0 || n > 23) return fallback;
  return n;
}

export function cycleNightModePreference(
  current: NightModePreference
): NightModePreference {
  if (current === "auto") return "day";
  if (current === "day") return "night";
  return "auto";
}

/** Night = cache-only for all modules; no background API polling. */
export function resolveAdaptivePoll(
  _moduleId: NightPollModuleId,
  dayIntervalMs: number,
  isNightMode: boolean
): { intervalMs: number; paused: boolean } {
  if (isNightMode) {
    return { intervalMs: dayIntervalMs, paused: true };
  }
  return { intervalMs: dayIntervalMs, paused: false };
}
