"use client";

import { useCoreResonance } from "@/context/CoreResonanceContext";

/** Abstract Jarvis Core — concentric layers with ambient resonance */
export function CentralHudRings() {
  const { isPlaying } = useCoreResonance();

  return (
    <div
      className={`hud-layer hud-core${isPlaying ? " hud-core--active" : " hud-core--idle"}`}
      aria-hidden
    >
      <div className="core-glow" />
      <div className="core-glow core-glow-outer" />
      <div className="clock-halo" />
      <div className="clock-ring clock-ring-outer" />
      <div className="clock-ring clock-ring-inner" />
      <div className="clock-ring clock-ring-core" />
    </div>
  );
}
