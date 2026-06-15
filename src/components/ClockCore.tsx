"use client";

import { CentralHudRings } from "@/components/CentralHudRings";
import { useCoreResonanceVisuals } from "@/hooks/useCoreResonanceVisuals";
import type { ReactNode } from "react";

interface ClockCoreProps {
  className?: string;
  children?: ReactNode;
}

export function ClockCore({ className = "", children }: ClockCoreProps) {
  const { setStageRef, isPlaying } = useCoreResonanceVisuals();

  return (
    <div
      ref={setStageRef}
      className={`clock-stage flex h-full flex-col items-center justify-center text-center${isPlaying ? " clock-stage--active" : ""} ${className}`.trim()}
    >
      <CentralHudRings />
      {children}
    </div>
  );
}
