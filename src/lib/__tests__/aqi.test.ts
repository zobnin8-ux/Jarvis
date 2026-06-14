import { describe, expect, it } from "vitest";
import { aqiLabel } from "@/lib/aqi";

describe("aqiLabel", () => {
  it("maps OpenWeather AQI levels", () => {
    expect(aqiLabel(1)).toBe("Good");
    expect(aqiLabel(2)).toBe("Fair");
    expect(aqiLabel(3)).toBe("Moderate");
    expect(aqiLabel(4)).toBe("Poor");
    expect(aqiLabel(5)).toBe("Very Poor");
    expect(aqiLabel(0)).toBe("Unknown");
    expect(aqiLabel(99)).toBe("Unknown");
  });
});
