"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useState } from "react";
import { CalendarTab } from "@/components/comms/CalendarTab";
import { CommsTabs, type CommsTabId } from "@/components/comms/CommsTabs";
import { MailTab } from "@/components/comms/MailTab";
import { Panel } from "@/components/ui/Panel";
import { useAdaptivePoll } from "@/hooks/useAdaptivePoll";
import { useIntervalFetch } from "@/hooks/useIntervalFetch";
import { getModuleConfig } from "@/lib/moduleRegistry";
import { fetchCalendar } from "@/services/calendarService";
import { fetchGmail } from "@/services/gmailService";

interface CommsModuleProps {
  compact?: boolean;
}

export function CommsModule({ compact = false }: CommsModuleProps) {
  const [tab, setTab] = useState<CommsTabId>("calendar");

  const calendarConfig = getModuleConfig("calendar");
  const gmailConfig = getModuleConfig("gmail");

  const calendarFetcher = useCallback(() => fetchCalendar(), []);
  const gmailFetcher = useCallback(() => fetchGmail(), []);

  const calendarPoll = useAdaptivePoll(
    "calendar",
    calendarConfig?.refreshInterval ?? 300_000
  );
  const gmailPoll = useAdaptivePoll("gmail", gmailConfig?.refreshInterval ?? 300_000);

  const calendarFetch = useIntervalFetch({
    fetcher: calendarFetcher,
    interval: calendarPoll.intervalMs,
    paused: calendarPoll.paused,
    cacheKey: "jarvis-cache-v2-calendar",
    healthId: "calendar",
  });

  const gmailFetch = useIntervalFetch({
    fetcher: gmailFetcher,
    interval: gmailPoll.intervalMs,
    paused: gmailPoll.paused,
    cacheKey: "jarvis-cache-v2-gmail",
  });

  return (
    <Panel
      className={`comms-panel calendar-panel overflow-hidden p-5 md:p-6${compact ? " comms-panel--compact" : " h-full"}`}
      delay={0.2}
    >
      <div className="calendar-atmosphere" aria-hidden />

      <div
        className={`relative z-[1] flex min-h-0 flex-col${compact ? "" : " h-full"}`}
      >
        <header className="comms-header">
          <div className="label">Comms</div>
          {!compact && (
            <CommsTabs
              active={tab}
              unreadCount={gmailFetch.data?.unreadCount ?? 0}
              onChange={setTab}
            />
          )}
        </header>

        <div
          className={`comms-tab-body flex min-h-0 flex-col${compact ? "" : " flex-1"}`}
        >
          <AnimatePresence mode="wait" initial={false}>
            {tab === "calendar" || compact ? (
              <motion.div
                key="calendar"
                className="comms-tab-pane flex min-h-0 flex-1 flex-col"
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 6 }}
                transition={{ duration: 0.18 }}
              >
                <CalendarTab
                  data={calendarFetch.data}
                  loading={calendarFetch.loading}
                  unavailableService={calendarFetch.unavailableService}
                  compact={compact}
                />
              </motion.div>
            ) : (
              <motion.div
                key="mail"
                className="comms-tab-pane flex min-h-0 flex-1 flex-col"
                initial={{ opacity: 0, x: 6 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -6 }}
                transition={{ duration: 0.18 }}
              >
                <MailTab
                  data={gmailFetch.data}
                  loading={gmailFetch.loading}
                  unavailableService={gmailFetch.unavailableService}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </Panel>
  );
}
