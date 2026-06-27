import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("lifecycle shutdown", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.useFakeTimers();
    process.env.NODE_ENV = "production";
    delete process.env.JARVIS_LIFECYCLE_SHUTDOWN;
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("schedules exit after last session unregisters", async () => {
    const exit = vi.spyOn(process, "exit").mockImplementation(() => undefined as never);
    const { handleLifecycle } = await import("../lifecycle");

    handleLifecycle("register", "tab-1");
    handleLifecycle("unregister", "tab-1");

    vi.advanceTimersByTime(5_000);
    expect(exit).toHaveBeenCalledWith(0);
  });

  it("does not exit while a session is alive", async () => {
    const exit = vi.spyOn(process, "exit").mockImplementation(() => undefined as never);
    const { handleLifecycle } = await import("../lifecycle");

    handleLifecycle("register", "tab-1");
    vi.advanceTimersByTime(20_000);
    expect(exit).not.toHaveBeenCalled();
  });
});
