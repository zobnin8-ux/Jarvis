import { describe, expect, it } from "vitest";
import {
  isRateLimitedError,
  rateLimitCooldownMs,
  UPSTREAM_RATE_LIMIT_COOLDOWN_MS,
} from "@/lib/server/upstreamCooldown";

describe("upstreamCooldown", () => {
  it("detects 429 in error message", () => {
    expect(isRateLimitedError(new Error("OpenWeather API error: 429/200"))).toBe(
      true
    );
    expect(isRateLimitedError(new Error("Spacedevs API error: 429"))).toBe(true);
    expect(isRateLimitedError(new Error("network fail"))).toBe(false);
  });

  it("extends cooldown on 429 only", () => {
    const normal = 10 * 60 * 1000;
    expect(rateLimitCooldownMs(new Error("500"), normal)).toBe(normal);
    expect(rateLimitCooldownMs(new Error("429"), normal)).toBe(
      UPSTREAM_RATE_LIMIT_COOLDOWN_MS
    );
  });
});
