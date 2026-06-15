/** After upstream 429 — do not refetch for this window; serve stale cache. */
export const UPSTREAM_RATE_LIMIT_COOLDOWN_MS = 15 * 60 * 1000;

export function isRateLimitedError(err: unknown): boolean {
  return err instanceof Error && err.message.includes("429");
}

export function rateLimitCooldownMs(err: unknown, fallbackMs: number): number {
  return isRateLimitedError(err) ? UPSTREAM_RATE_LIMIT_COOLDOWN_MS : fallbackMs;
}
