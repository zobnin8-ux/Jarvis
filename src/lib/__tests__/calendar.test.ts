import { describe, expect, it, vi, afterEach } from "vitest";
import {
  buildWeekStrip,
  findNextEvent,
  formatDayLabel,
  groupEventsByDay,
  inferEventCategory,
  mergeTasksIntoWeek,
} from "@/lib/calendar";
import type { CalendarEvent } from "@/types/modules";

describe("inferEventCategory", () => {
  it("classifies calls", () => {
    expect(inferEventCategory("Design Sync with Zoom")).toBe("call");
    expect(inferEventCategory("Weekly standup")).toBe("call");
  });

  it("classifies personal events", () => {
    expect(inferEventCategory("Gym session")).toBe("personal");
    expect(inferEventCategory("Dentist appointment")).toBe("personal");
  });

  it("classifies work events", () => {
    expect(inferEventCategory("Project Orion Review")).toBe("work");
    expect(inferEventCategory("Client demo")).toBe("work");
  });

  it("falls back to other", () => {
    expect(inferEventCategory("Random note")).toBe("other");
  });
});

describe("formatDayLabel", () => {
  it("returns Today and Tomorrow", () => {
    expect(formatDayLabel("2026-06-11", "2026-06-11")).toBe("Today");
    expect(formatDayLabel("2026-06-12", "2026-06-11")).toBe("Tomorrow");
  });

  it("returns weekday for other dates", () => {
    const label = formatDayLabel("2026-06-15", "2026-06-11");
    expect(label).not.toBe("Today");
    expect(label).not.toBe("Tomorrow");
    expect(label.length).toBeGreaterThan(0);
  });
});

describe("buildWeekStrip", () => {
  it("returns 7 days with today marked", () => {
    const ref = new Date(2026, 5, 11, 12, 0, 0);
    const counts = new Map([["2026-06-11", 2]]);
    const strip = buildWeekStrip(ref, counts);

    expect(strip).toHaveLength(7);
    expect(strip.some((d) => d.isToday)).toBe(true);
    expect(strip.find((d) => d.isToday)?.hasEvents).toBe(true);
  });
});

describe("findNextEvent", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("skips past and all-day events", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-11T15:00:00"));

    const events: CalendarEvent[] = [
      {
        time: "09:00",
        title: "Past meeting",
        isAllDay: false,
        category: "work",
        startIso: "2026-06-11T09:00:00",
      },
      {
        time: "All day",
        title: "Holiday",
        isAllDay: true,
        category: "personal",
        startIso: "2026-06-11T00:00:00",
      },
      {
        time: "18:00",
        title: "Evening sync",
        isAllDay: false,
        category: "call",
        startIso: "2026-06-11T18:00:00",
      },
    ];

    const next = findNextEvent(events);
    expect(next?.title).toBe("Evening sync");
  });

  it("returns null when no upcoming timed events", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-11T20:00:00"));

    const events: CalendarEvent[] = [
      {
        time: "09:00",
        title: "Morning",
        isAllDay: false,
        category: "work",
        startIso: "2026-06-11T09:00:00",
      },
    ];

    expect(findNextEvent(events)).toBeNull();
  });
});

describe("groupEventsByDay", () => {
  it("groups timed and all-day events and sorts within day", () => {
    const weekStart = new Date(2026, 5, 8, 0, 0, 0);
    const days = groupEventsByDay(
      [
        {
          summary: "Afternoon review",
          start: { dateTime: "2026-06-11T14:00:00" },
        },
        {
          summary: "Morning standup",
          start: { dateTime: "2026-06-11T09:00:00" },
        },
        {
          summary: "Offsite",
          start: { date: "2026-06-12" },
        },
      ],
      weekStart
    );

    expect(days).toHaveLength(7);
    const wed = days.find((d) => d.dateKey === "2026-06-11");
    expect(wed?.events).toHaveLength(2);
    expect(wed?.events[0].title).toBe("Morning standup");
    expect(wed?.events[1].title).toBe("Afternoon review");

    const thu = days.find((d) => d.dateKey === "2026-06-12");
    expect(thu?.events[0].isAllDay).toBe(true);
  });
});

describe("mergeTasksIntoWeek", () => {
  it("adds reminders and sorts with events", () => {
    const weekStart = new Date("2026-06-08T00:00:00");
    const week = groupEventsByDay(
      [
        {
          summary: "Standup",
          start: { dateTime: "2026-06-11T09:00:00-07:00" },
        },
      ],
      weekStart
    );

    const merged = mergeTasksIntoWeek(week, [
      {
        id: "t1",
        title: "Call pharmacy",
        due: "2026-06-11T17:30:00.000Z",
      },
    ]);

    const wed = merged.find((d) => d.dateKey === "2026-06-11");
    expect(wed?.events).toHaveLength(2);
    expect(wed?.events[0].title).toBe("Standup");
    expect(wed?.events[1].category).toBe("reminder");
    expect(wed?.events[1].title).toBe("Call pharmacy");
  });
});
