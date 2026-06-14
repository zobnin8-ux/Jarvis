"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { getCountdownParts, type CountdownParts } from "@/lib/format";
import { useNightMode } from "@/context/NightModeContext";
import type { LaunchPhase } from "@/types/modules";

interface LaunchCountdownProps {
  launchTime: string;
  status: string;
  phase: LaunchPhase;
}

export function LaunchCountdown({
  launchTime,
  status,
  phase,
}: LaunchCountdownProps) {
  const { isNightMode } = useNightMode();
  const initialMs = useRef<number | null>(null);
  const [parts, setParts] = useState<CountdownParts>(() =>
    getCountdownParts(launchTime)
  );

  useEffect(() => {
    initialMs.current = getCountdownParts(launchTime).totalMs;

    const tick = () => setParts(getCountdownParts(launchTime));
    tick();
    if (isNightMode) return;
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [launchTime, isNightMode]);

  const progress =
    initialMs.current && initialMs.current > 0
      ? 1 - parts.totalMs / initialMs.current
      : parts.isComplete
        ? 1
        : 0;

  const isUrgent = parts.totalMs > 0 && parts.totalMs < 60 * 60 * 1000;
  const accent = isUrgent ? "#FFB84D" : "#55D6FF";

  if (phase === "liftoff" || (parts.isComplete && phase !== "countdown")) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="launch-liftoff"
      >
        {isNightMode ? (
          <div
            className="font-mono text-3xl tracking-[0.28em] text-secondary md:text-4xl"
            style={{ textShadow: "0 0 40px rgba(255, 184, 77, 0.35)" }}
          >
            LIFTOFF
          </div>
        ) : (
          <motion.div
            animate={{ opacity: [0.75, 1, 0.75] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
            className="font-mono text-3xl tracking-[0.28em] text-secondary md:text-4xl"
            style={{ textShadow: "0 0 40px rgba(255, 184, 77, 0.35)" }}
          >
            LIFTOFF
          </motion.div>
        )}
        <div className="mt-2 font-mono text-[0.62rem] tracking-[0.2em] text-white/38 uppercase">
          Awaiting telemetry
        </div>
      </motion.div>
    );
  }

  if (parts.isComplete || status === "LAUNCHED") {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="font-mono text-3xl tracking-widest text-secondary md:text-4xl"
        style={{ textShadow: "0 0 40px rgba(255, 184, 77, 0.35)" }}
      >
        T-0
      </motion.div>
    );
  }

  return (
    <div className="w-full">
      <div className="flex items-center gap-2 md:gap-3">
        <span className="font-mono text-lg text-white/40 md:text-xl">T</span>
        <span className="font-mono text-lg text-accent/50 md:text-xl">−</span>

        {parts.days > 0 && (
          <>
            <CountdownUnit value={parts.days} label="days" accent={accent} wide />
            <Separator accent={accent} static={isNightMode} />
          </>
        )}

        <CountdownUnit value={parts.hours} label="hrs" accent={accent} />
        <Separator accent={accent} static={isNightMode} />
        <CountdownUnit value={parts.minutes} label="min" accent={accent} />
        <Separator accent={accent} static={isNightMode} />
        <CountdownUnit
          value={parts.seconds}
          label="sec"
          accent={accent}
          pulse={!isNightMode}
        />
      </div>

      <div className="mt-4 h-px w-full overflow-hidden rounded-full bg-white/5">
        <motion.div
          className="h-full rounded-full"
          style={{
            background: `linear-gradient(90deg, ${accent}88, ${accent})`,
            boxShadow: `0 0 12px ${accent}44`,
          }}
          animate={{ width: `${Math.min(100, progress * 100)}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}

function CountdownUnit({
  value,
  label,
  accent,
  wide = false,
  pulse = false,
}: {
  value: number;
  label: string;
  accent: string;
  wide?: boolean;
  pulse?: boolean;
}) {
  const display = wide ? String(value) : String(value).padStart(2, "0");

  return (
    <div className="text-center">
      <div
        className="relative overflow-hidden rounded border border-white/5 bg-white/[0.02] px-2 py-1.5 md:px-3 md:py-2"
        style={{ boxShadow: `inset 0 0 20px ${accent}08` }}
      >
        <AnimatePresence mode="popLayout">
          <motion.div
            key={display}
            initial={{ opacity: 0, y: 8, filter: "blur(4px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -8, filter: "blur(4px)" }}
            transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
            className="font-mono text-2xl tabular-nums md:text-3xl"
            style={{
              color: accent,
              textShadow: `0 0 24px ${accent}44`,
            }}
          >
            {display}
          </motion.div>
        </AnimatePresence>

        {pulse && (
          <motion.div
            className="pointer-events-none absolute inset-0 rounded"
            animate={{ opacity: [0.15, 0.35, 0.15] }}
            transition={{ duration: 1, repeat: Infinity, ease: "easeInOut" }}
            style={{ boxShadow: `inset 0 0 16px ${accent}33` }}
          />
        )}
      </div>
      <div className="mt-1.5 text-[9px] tracking-[0.2em] text-white/30 uppercase">
        {label}
      </div>
    </div>
  );
}

function Separator({ accent, static: isStatic = false }: { accent: string; static?: boolean }) {
  if (isStatic) {
    return (
      <span
        className="mb-5 font-mono text-xl"
        style={{ color: `${accent}88`, opacity: 0.5 }}
      >
        :
      </span>
    );
  }

  return (
    <motion.span
      animate={{ opacity: [0.3, 0.7, 0.3] }}
      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      className="mb-5 font-mono text-xl"
      style={{ color: `${accent}88` }}
    >
      :
    </motion.span>
  );
}
