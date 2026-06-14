"use client";

import { useEffect, useState } from "react";
import { CentralHudRings } from "@/components/CentralHudRings";
import { SystemStatus } from "@/components/SystemStatus";
import { formatDate, formatTime, getGreeting } from "@/lib/format";
import { useCoreResonanceVisuals } from "@/hooks/useCoreResonanceVisuals";
import { useMounted } from "@/hooks/useMounted";
import { useNightMode } from "@/context/NightModeContext";

const USER_NAME = process.env.NEXT_PUBLIC_USER_NAME ?? "Andrei";

export function ClockModule() {
  const mounted = useMounted();
  const { isNightMode } = useNightMode();
  const { setStageRef, isPlaying } = useCoreResonanceVisuals();
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
  const timeString = mounted ? formatTime(now) : "--:--";

  return (
    <div
      ref={setStageRef}
      className={`clock-stage flex h-full flex-col items-center justify-center text-center${isPlaying ? " clock-stage--active" : ""}`}
    >
      <CentralHudRings />

      <div className="clock-content relative z-10 flex flex-col items-center px-4 md:px-8">
        <div className="clock-time font-mono text-[clamp(5.5rem,16vw,12.5rem)] font-extralight leading-none">
          {timeString}
        </div>

        <div className="clock-meta mt-7 space-y-2">
          <div className="clock-weekday">{mounted ? weekday : "—"}</div>
          <div className="clock-date">{mounted ? dateParts.join(" ") : "—"}</div>
        </div>

        <div className="clock-greeting mt-8">
          {mounted ? getGreeting(now, USER_NAME) : "—"}
        </div>

        {mounted && <SystemStatus />}
      </div>
    </div>
  );
}
