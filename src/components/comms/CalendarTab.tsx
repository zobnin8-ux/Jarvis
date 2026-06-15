"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { ServiceUnavailablePanel } from "@/components/ui/ServiceUnavailablePanel";
import { categoryLabel, formatMinutesUntil } from "@/lib/calendar";
import type {
  CalendarData,
  CalendarDay,
  CalendarEvent,
  CalendarNextEvent,
  CalendarWeekDay,
} from "@/types/modules";

interface CalendarTabProps {
  data: CalendarData | null;
  loading: boolean;
  unavailableService: string | null;
}

export function CalendarTab({
  data,
  loading,
  unavailableService,
}: CalendarTabProps) {
  const [weekOpen, setWeekOpen] = useState(false);
  const [selectedDateKey, setSelectedDateKey] = useState("");

  useEffect(() => {
    if (!data) return;
    const stillInWeek = data.week.some((day) => day.dateKey === selectedDateKey);
    if (!selectedDateKey || !stillInWeek) {
      setSelectedDateKey(data.today.dateKey);
    }
  }, [data, selectedDateKey]);

  const selectedDay = useMemo(() => {
    if (!data) return null;
    return (
      data.week.find((day) => day.dateKey === selectedDateKey) ?? data.today
    );
  }, [data, selectedDateKey]);

  const weekAsideSelected = useMemo(
    () =>
      data?.week?.filter((day) => day.dateKey !== selectedDateKey) ?? [],
    [data, selectedDateKey]
  );

  if (unavailableService) {
    return <ServiceUnavailablePanel service={unavailableService} />;
  }

  if (loading && !data) {
    return <div className="text-sm text-white/30">Syncing calendar...</div>;
  }

  if (!data) return null;

  return (
    <>
      {data.monthLabel && (
        <div className="comms-tab-meta calendar-month">{data.monthLabel}</div>
      )}

      <WeekStrip
        days={data.weekStrip}
        selectedDateKey={selectedDateKey}
        onSelectDay={setSelectedDateKey}
      />
      <NextEventBlock next={data.nextEvent} />

      {selectedDay && (
        <section
          className="calendar-today flex-1 min-h-0"
          aria-label={selectedDay.label}
        >
          <div className="calendar-section-label">
            {selectedDay.label.toUpperCase()}
            <span className="calendar-event-count">
              {selectedDay.events.length} events
            </span>
          </div>

          {selectedDay.events.length === 0 ? (
            <div className="calendar-empty">Clear schedule</div>
          ) : (
            <ul className="calendar-timeline">
              {selectedDay.events.map((event, index) => (
                <TimelineItem
                  key={`${event.startIso}-${event.title}-${index}`}
                  event={event}
                  isNext={data.nextEvent?.startIso === event.startIso}
                />
              ))}
            </ul>
          )}
        </section>
      )}

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
                {weekAsideSelected.map((day) => (
                  <WeekDayRow key={day.dateKey} day={day} />
                ))}
              </ul>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}

function WeekStrip({
  days,
  selectedDateKey,
  onSelectDay,
}: {
  days: CalendarWeekDay[];
  selectedDateKey: string;
  onSelectDay: (dateKey: string) => void;
}) {
  return (
    <div className="calendar-week-strip" aria-label="Week overview">
      <div className="calendar-week-strip-letters">
        {days.map((day) => (
          <div key={`${day.dateKey}-letter`} className="calendar-strip-cell">
            {day.weekdayLetter}
          </div>
        ))}
      </div>
      <div className="calendar-week-strip-days" role="tablist" aria-label="Select day">
        {days.map((day) => {
          const isSelected = day.dateKey === selectedDateKey;
          return (
            <button
              key={day.dateKey}
              type="button"
              role="tab"
              aria-selected={isSelected}
              className={`calendar-strip-cell calendar-strip-day${day.isToday ? " is-today" : ""}${isSelected ? " is-selected" : ""}`}
              onClick={() => onSelectDay(day.dateKey)}
            >
              <span className="calendar-strip-number">{day.dayNumber}</span>
              {day.hasEvents && <span className="calendar-strip-dot" aria-hidden />}
            </button>
          );
        })}
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
        <span
          className={`calendar-timeline-dot calendar-timeline-dot--${event.category}`}
        />
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
          <span className="calendar-week-row-count">{day.events.length}</span>
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
