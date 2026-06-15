import { describe, expect, it } from "vitest";
import { isNightBySchedule, isNightHour } from "@/lib/nightSchedule";

describe("isNightHour", () => {
  it("handles overnight window 23–7", () => {
    expect(isNightHour(22, 23, 7)).toBe(false);
    expect(isNightHour(23, 23, 7)).toBe(true);
    expect(isNightHour(3, 23, 7)).toBe(true);
    expect(isNightHour(6, 23, 7)).toBe(true);
    expect(isNightHour(7, 23, 7)).toBe(false);
    expect(isNightHour(12, 23, 7)).toBe(false);
  });

  it("handles same-day window 1–5", () => {
    expect(isNightHour(0, 1, 5)).toBe(false);
    expect(isNightHour(2, 1, 5)).toBe(true);
    expect(isNightHour(5, 1, 5)).toBe(false);
  });
});

describe("isNightBySchedule", () => {
  const opts = { timeZone: "UTC", startHour: 23, endHour: 7 };

  it("uses timezone-local hour", () => {
    expect(isNightBySchedule(new Date("2026-06-11T04:00:00Z"), opts)).toBe(true);
    expect(isNightBySchedule(new Date("2026-06-11T12:00:00Z"), opts)).toBe(false);
  });
});
