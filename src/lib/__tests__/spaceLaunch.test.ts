import { describe, expect, it, vi, afterEach } from "vitest";
import {
  buildLaunchDetails,
  formatPostLaunchRemaining,
  isSpaceXOrNasa,
  mapOutcome,
  POST_LAUNCH_WINDOW_MS,
  resolveLaunchPhase,
  type SpacedevsLaunch,
} from "@/lib/spaceLaunch";

const baseLaunch = (): SpacedevsLaunch => ({
  id: "test-launch",
  name: "Starlink Group 6-45",
  net: "2026-06-11T12:00:00Z",
  status: { id: 3, description: "Launch Success" },
  launch_service_provider: { name: "SpaceX" },
  mission: {
    description: "Payload deployment confirmed",
    orbit: { name: "Low Earth Orbit" },
    type: "Communications",
  },
  rocket: { configuration: { full_name: "Falcon 9 Block 5" } },
  pad: { name: "SLC-40", latitude: "28.5", longitude: "-80.5" },
});

describe("mapOutcome", () => {
  it("maps known status ids", () => {
    expect(mapOutcome(3)).toBe("SUCCESS");
    expect(mapOutcome(4)).toBe("FAILURE");
    expect(mapOutcome(7)).toBe("PARTIAL");
    expect(mapOutcome(5)).toBe("PENDING");
    expect(mapOutcome(999)).toBe("UNKNOWN");
  });
});

describe("isSpaceXOrNasa", () => {
  it("detects spacex and nasa operators", () => {
    expect(isSpaceXOrNasa("SpaceX")).toBe(true);
    expect(isSpaceXOrNasa("NASA")).toBe(true);
    expect(isSpaceXOrNasa("Rocket Lab")).toBe(false);
  });
});

describe("resolveLaunchPhase", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns countdown before launch", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-11T11:00:00Z"));
    expect(resolveLaunchPhase("2026-06-11T12:00:00Z", "PENDING")).toBe(
      "countdown"
    );
  });

  it("returns liftoff shortly after pending launch", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-11T12:10:00Z"));
    expect(resolveLaunchPhase("2026-06-11T12:00:00Z", "PENDING")).toBe(
      "liftoff"
    );
  });

  it("returns postlaunch after liftoff window", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-11T13:00:00Z"));
    expect(resolveLaunchPhase("2026-06-11T12:00:00Z", "SUCCESS")).toBe(
      "postlaunch"
    );
  });

  it("returns countdown after post-launch window expires", () => {
    vi.useFakeTimers();
    vi.setSystemTime(
      new Date(new Date("2026-06-11T12:00:00Z").getTime() + POST_LAUNCH_WINDOW_MS + 1000)
    );
    expect(resolveLaunchPhase("2026-06-11T12:00:00Z", "SUCCESS")).toBe(
      "countdown"
    );
  });
});

describe("buildLaunchDetails", () => {
  it("extracts orbit, booster, and payload lines", () => {
    const launch = baseLaunch();
    const lines = buildLaunchDetails(launch, "SUCCESS", "deployment confirmed");
    const labels = lines.map((l) => l.label);

    expect(labels).toContain("Outcome");
    expect(labels).toContain("Orbit");
    expect(labels).toContain("Payload");
  });
});

describe("formatPostLaunchRemaining", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("formats remaining time until expiry", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-11T12:00:00Z"));
    const expires = new Date("2026-06-11T15:30:00Z").toISOString();
    expect(formatPostLaunchRemaining(expires)).toBe("3h 30m");
  });

  it("returns null when expired or missing", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-12T00:00:00Z"));
    expect(formatPostLaunchRemaining("2026-06-11T12:00:00Z")).toBeNull();
    expect(formatPostLaunchRemaining(undefined)).toBeNull();
  });
});
