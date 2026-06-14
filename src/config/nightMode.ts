export type NightPollModuleId =
  | "iss"
  | "weather"
  | "calendar"
  | "briefing"
  | "space"
  | "worldNews"
  | "nasa"
  | "sv";

export const NIGHT_MODE_STORAGE_KEY = "jarvis-night-mode";

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
