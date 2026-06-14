import { describe, expect, it, vi, afterEach } from "vitest";
import {
  getDayPart,
  getDayPartFromUtcOffset,
  getDayPartGreeting,
  getLocalHourInTimeZone,
  resolveDayPart,
} from "@/lib/daypart";

describe("getDayPart", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("classifies hours without timezone", () => {
    expect(getDayPart(new Date(2026, 5, 11, 2, 0, 0))).toBe("night");
    expect(getDayPart(new Date(2026, 5, 11, 8, 0, 0))).toBe("morning");
    expect(getDayPart(new Date(2026, 5, 11, 14, 0, 0))).toBe("afternoon");
    expect(getDayPart(new Date(2026, 5, 11, 20, 0, 0))).toBe("evening");
  });

  it("respects IANA timezone via BRIEFING_TZ", () => {
    vi.stubEnv("BRIEFING_TZ", "America/Los_Angeles");
    const utcMorning = new Date("2026-06-11T16:00:00Z");
    expect(resolveDayPart(utcMorning)).toBe("morning");
  });

  it("uses utc offset fallback when env tz absent", () => {
    const date = new Date("2026-06-11T10:00:00Z");
    expect(getDayPartFromUtcOffset(date, 0)).toBe("morning");
    expect(getDayPartFromUtcOffset(date, 5 * 3600)).toBe("afternoon");
  });

  it("returns Russian greeting by day part", () => {
    expect(getDayPartGreeting("Andrei", "night")).toBe("Доброй ночи, Andrei.");
    expect(getDayPartGreeting("Andrei", "morning")).toBe("Доброе утро, Andrei.");
  });
});

describe("getLocalHourInTimeZone", () => {
  it("computes hour in target timezone", () => {
    const hour = getLocalHourInTimeZone(
      new Date("2026-06-11T16:00:00Z"),
      "America/Los_Angeles"
    );
    expect(hour).toBe(9);
  });
});
