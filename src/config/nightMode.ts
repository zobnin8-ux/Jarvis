/** Night-mode poll intervals — slower upstream, fewer wakeups. */
export const NIGHT_POLL_MS = {
  iss: 2 * 60 * 1000,
  weather: 60 * 60 * 1000,
  calendar: 30 * 60 * 1000,
  briefing: 3 * 60 * 60 * 1000,
  space: 60 * 60 * 1000,
  worldNews: 30 * 60 * 1000,
  nasa: 2 * 60 * 60 * 1000,
  sv: 30 * 60 * 1000,
} as const;

export type NightPollModuleId = keyof typeof NIGHT_POLL_MS;

export const NIGHT_MODE_STORAGE_KEY = "jarvis-night-mode";

export function resolveAdaptivePoll(
  moduleId: NightPollModuleId,
  dayIntervalMs: number,
  isNightMode: boolean,
  tabHidden: boolean
): { intervalMs: number; paused: boolean } {
  if (!isNightMode) {
    return { intervalMs: dayIntervalMs, paused: false };
  }
  if (tabHidden) {
    return { intervalMs: dayIntervalMs, paused: true };
  }
  return { intervalMs: NIGHT_POLL_MS[moduleId], paused: false };
}
