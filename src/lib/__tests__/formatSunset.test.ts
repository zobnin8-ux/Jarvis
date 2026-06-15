import { describe, expect, it } from "vitest";
import { formatSunset } from "@/lib/format";

describe("formatSunset", () => {
  it("formats UTC city time with zero offset", () => {
    const ts = Math.floor(Date.UTC(2024, 0, 1, 20, 47, 0) / 1000);
    expect(formatSunset(ts, 0)).toBe("20:47");
  });

  it("applies OpenWeather timezone offset (San Jose PDT)", () => {
    // Sunset 2024-06-15 ~20:29 PDT = 2024-06-16 03:29 UTC
    const ts = Math.floor(Date.UTC(2024, 5, 16, 3, 29, 0) / 1000);
    const pdtOffsetSec = -7 * 3600;
    expect(formatSunset(ts, pdtOffsetSec)).toBe("20:29");
  });

  it("requires timezone offset for city-local sunset", () => {
    const ts = Math.floor(Date.UTC(2024, 5, 16, 3, 29, 0) / 1000);
    expect(formatSunset(ts, 0)).toBe("03:29");
    expect(formatSunset(ts, -7 * 3600)).toBe("20:29");
  });

  it("pads minutes", () => {
    const ts = Math.floor(Date.UTC(2024, 0, 1, 8, 5, 0) / 1000);
    expect(formatSunset(ts, 0)).toBe("08:05");
  });
});
