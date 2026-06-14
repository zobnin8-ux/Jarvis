"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useMemo, useState } from "react";
import { Panel } from "@/components/ui/Panel";
import { ServiceUnavailablePanel } from "@/components/ui/ServiceUnavailablePanel";
import { useIntervalFetch } from "@/hooks/useIntervalFetch";
import { categoryLabel, formatMinutesUntil } from "@/lib/calendar";
import { fetchCalendar } from "@/services/calendarService";
import { getModuleConfig } from "@/lib/moduleRegistry";
import type {
  CalendarDay,
  CalendarEvent,
  CalendarNextEvent,
  CalendarWeekDay,
} from "@/types/modules";

export function CalendarModule() {
  const [weekOpen, setWeekOpen] = useState(false);
  const config = getModuleConfig("calendar");
  const fetcher = useCallback(() => fetchCalendar(), []);
  const { data, loading, unavailableService } = useIntervalFetch({
    fetcher,
    interval: config?.refreshInterval ?? 300000,
    cacheKey: "jarvis-cache-v2-calendar",
    healthId: "calendar",
  });

  const weekAsideToday = useMemo(
    () => data?.week?.filter((day) => day.dateKey !== data.today.dateKey) ?? [],
    [data]
  );

  return (
    <Panel className="calendar-panel h-full overflow-hidden p-5 md:p-6" delay={0.2}>
      <div className="calendar-atmosphere" aria-hidden />

      <div className="relative z-[1] flex h-full min-h-0 flex-col">
        <header className="calendar-header">
          <div className="label">Calendar</div>
          {data && <div className="calendar-month">{data.monthLabel}</div>}
        </header>

        {unavailableService ? (
          <ServiceUnavailablePanel service={unavailableService} />
        ) : loading && !data ? (
          <div className="text-sm text-white/30">Syncing calendar...</div>
        ) : data ? (
          <>
            <WeekStrip days={data.weekStrip} />

            <NextEventBlock next={data.nextEvent} />

            <section className="calendar-today flex-1 min-h-0" aria-label="Today">
              <div className="calendar-section-label">
                {data.today.label.toUpperCase()}
                <span className="calendar-event-count">
                  {data.today.events.length} events
                </span>
              </div>

              {data.today.events.length === 0 ? (
                <div className="calendar-empty">Clear schedule</div>
              ) : (
                <ul className="calendar-timeline">
                  {data.today.events.map((event, index) => (
                    <TimelineItem
                      key={`${event.startIso}-${event.title}-${index}`}
                      event={event}
                      isNext={data.nextEvent?.startIso === event.startIso}
                    />
                  ))}
                </ul>
              )}
            </section>

            <div className="calendar-footer mt-auto">
              <button
                type="button"
                className="calendar-week-toggle"
                onClick={() => setWeekOpen((open) => !open)}
                aria-expanded={weekOpen}
              >
                <span
                  className={`calendar-week-chevron${weekOpen ? " is-open" : ""}`}
                  aria-hidden
                >
                  ▸
                </span>
                This Week · {data.totalWeekEvents} events
              </button>

              <AnimatePresence initial={false}>
                {weekOpen && (
                  <motion.div
                    key="week"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
                    className="calendar-week overflow-hidden"
                  >
                    <ul className="calendar-week-list">
                      {weekAsideToday.map((day) => (
                        <WeekDayRow key={day.dateKey} day={day} />
                      ))}
                    </ul>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </>
        ) : null}
      </div>
    </Panel>
  );
}

function WeekStrip({ days }: { days: CalendarWeekDay[] }) {
  return (
    <div className="calendar-week-strip" aria-label="Week overview">
      <div className="calendar-week-strip-letters">
        {days.map((day) => (
          <div key={`${day.dateKey}-letter`} className="calendar-strip-cell">
            {day.weekdayLetter}
          </div>
        ))}
      </div>
      <div className="calendar-week-strip-days">
        {days.map((day) => (
          <div
            key={day.dateKey}
            className={`calendar-strip-cell calendar-strip-day${day.isToday ? " is-today" : ""}`}
          >
            <span className="calendar-strip-number">{day.dayNumber}</span>
            {day.hasEvents && <span className="calendar-strip-dot" aria-hidden />}
          </div>
        ))}
      </div>
    </div>
  );
}

function NextEventBlock({ next }: { next: CalendarNextEvent | null }) {
  if (!next) {
    return (
      <div className="calendar-next calendar-next--clear">
        <div className="calendar-next-label">Next</div>
        <div className="calendar-next-clear">Clear for now</div>
      </div>
    );
  }

  const tag = categoryLabel(next.category);
  const minutesUntil = formatMinutesUntil(next.startIso);

  return (
    <div className="calendar-next">
      <div className="calendar-next-label">
        Next · {next.time}
        {minutesUntil && (
          <span className="calendar-next-countdown"> · {minutesUntil}</span>
        )}
      </div>
      <div className="calendar-next-title">{next.title}</div>
      {next.location && (
        <div className="calendar-next-location">{next.location}</div>
      )}
      {next.joinUrl && (
        <div className="calendar-next-join">{next.joinUrl}</div>
      )}
      {tag && <div className="calendar-next-tag">{tag}</div>}
    </div>
  );
}

function TimelineItem({
  event,
  isNext,
}: {
  event: CalendarEvent;
  isNext: boolean;
}) {
  const tag = categoryLabel(event.category);

  return (
    <li className={`calendar-timeline-item${isNext ? " is-next" : ""}`}>
      <div className="calendar-timeline-rail" aria-hidden>
        <span className={`calendar-timeline-dot calendar-timeline-dot--${event.category}`} />
      </div>
      <div className="calendar-timeline-body">
        <div className="calendar-timeline-time">{event.time}</div>
        <div className="calendar-timeline-title">{event.title}</div>
        {tag && <div className="calendar-timeline-tag">{tag}</div>}
      </div>
    </li>
  );
}

function WeekDayRow({ day }: { day: CalendarDay }) {
  return (
    <li className="calendar-week-row">
      <div className="calendar-week-row-header">
        <span className="calendar-week-row-day">{day.label}</span>
        {day.events.length > 0 && (
          <span className="calendar-week-row-count">
            {day.events.length}
          </span>
        )}
      </div>

      {day.events.length === 0 ? (
        <div className="calendar-week-row-empty">Clear</div>
      ) : (
        <ul className="calendar-week-events">
          {day.events.map((event, index) => (
            <li
              key={`${day.dateKey}-${event.startIso}-${index}`}
              className="calendar-week-event"
            >
              <span
                className={`calendar-week-event-dot calendar-week-event-dot--${event.category}`}
                aria-hidden
              />
              <span className="calendar-week-event-time">{event.time}</span>
              <span className="calendar-week-event-title">{event.title}</span>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}
