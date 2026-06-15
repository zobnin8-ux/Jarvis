"use client";

import { useEffect, useState } from "react";
import { useNightMode } from "@/context/NightModeContext";
import { formatDate, formatTime, getGreeting } from "@/lib/format";
import { useMounted } from "@/hooks/useMounted";

const USER_NAME = process.env.NEXT_PUBLIC_USER_NAME ?? "Andrei";

export function useClockNow() {
  const mounted = useMounted();
  const { isNightMode } = useNightMode();
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    if (!mounted) return;
    const tickMs = isNightMode ? 60_000 : 1000;
    const timer = setInterval(() => setNow(new Date()), tickMs);
    return () => clearInterval(timer);
  }, [mounted, isNightMode]);

  const [weekday, ...dateParts] = mounted
    ? formatDate(now).split("\n")
    : ["", ""];

  return {
    mounted,
    weekday,
    dateLine: dateParts.join(" "),
    timeString: mounted ? formatTime(now) : "--:--",
    greeting: mounted ? getGreeting(now, USER_NAME) : "—",
  };
}
