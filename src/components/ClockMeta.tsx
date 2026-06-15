"use client";

import { SystemStatus } from "@/components/SystemStatus";
import { useClockNow } from "@/hooks/useClockNow";

interface ClockMetaProps {
  align?: "center" | "left";
  showStatus?: boolean;
  className?: string;
}

export function ClockMeta({
  align = "center",
  showStatus = true,
  className = "",
}: ClockMetaProps) {
  const { mounted, weekday, dateLine, timeString, greeting } = useClockNow();

  const alignClass =
    align === "left" ? "clock-meta-block--left" : "clock-meta-block--center";

  return (
    <div className={`clock-meta-block ${alignClass} ${className}`.trim()}>
      <div
        className={`clock-content relative z-10 flex flex-col px-4 md:px-8${
          align === "left" ? " items-start text-left" : " items-center text-center"
        }`}
      >
        <div className="clock-time font-mono text-[clamp(5.5rem,16vw,12.5rem)] font-extralight leading-none">
          {timeString}
        </div>

        <div className="clock-meta mt-7 space-y-2">
          <div className="clock-weekday">{mounted ? weekday : "—"}</div>
          <div className="clock-date">{mounted ? dateLine : "—"}</div>
        </div>

        <div className="clock-greeting mt-8">{greeting}</div>

        {showStatus && mounted && <SystemStatus />}
      </div>
    </div>
  );
}
