import { describe, expect, it } from "vitest";
import { ACTIVE_MODULES } from "@/lib/moduleRegistry";
import { UPSTREAM_RATE_LIMIT_COOLDOWN_MS } from "@/lib/server/upstreamCooldown";

const FIFTEEN_MIN = 15 * 60 * 1000;
const TEN_MIN = 10 * 60 * 1000;

describe("pollingPolicy", () => {
  it("space module polls no faster than every 15 minutes", () => {
    const space = ACTIVE_MODULES.find((m) => m.id === "space");
    expect(space?.refreshInterval).toBeGreaterThanOrEqual(FIFTEEN_MIN);
  });

  it("weather module polls no faster than every 10 minutes", () => {
    const weather = ACTIVE_MODULES.find((m) => m.id === "weather");
    expect(weather?.refreshInterval).toBeGreaterThanOrEqual(TEN_MIN);
  });

  it("briefing polls no faster than every 15 minutes", () => {
    const briefing = ACTIVE_MODULES.find((m) => m.id === "ai-briefing");
    expect(briefing?.refreshInterval).toBeGreaterThanOrEqual(FIFTEEN_MIN);
  });

  it("upstream 429 cooldown is 15 minutes", () => {
    expect(UPSTREAM_RATE_LIMIT_COOLDOWN_MS).toBe(FIFTEEN_MIN);
  });
});
