"use client";

import { useEffect, useRef } from "react";
import { CoreReactorEngine } from "@/lib/coreReactorEngine";
import { useCoreResonance } from "@/context/CoreResonanceContext";

const IDLE_BASE = 0.1;
const IDLE_SWING = 0.08;
const IDLE_CYCLE_SEC = 16;

function idleBreath(): number {
  const t = performance.now() / 1000;
  const wave = 0.5 + 0.5 * Math.sin((t / IDLE_CYCLE_SEC) * Math.PI * 2);
  return IDLE_BASE + wave * IDLE_SWING;
}

function applySignals(
  targets: (HTMLElement | null | undefined)[],
  values: Record<string, string>
): void {
  for (const target of targets) {
    if (!target) continue;
    for (const [key, value] of Object.entries(values)) {
      target.style.setProperty(key, value);
    }
  }
}

export function useCoreResonanceVisuals() {
  const { isPlaying, getAnalyser, station } = useCoreResonance();
  const stageRef = useRef<HTMLDivElement | null>(null);
  const hudRef = useRef<HTMLElement | null>(null);
  const zoneRef = useRef<HTMLElement | null>(null);
  const engineRef = useRef<CoreReactorEngine | null>(null);
  const stationRef = useRef(station.id);

  useEffect(() => {
    stationRef.current = station.id;
    engineRef.current?.setStation(station.id);
  }, [station.id]);

  useEffect(() => {
    if (!isPlaying) {
      engineRef.current?.reset();
      engineRef.current?.setStation(stationRef.current);
    }
  }, [isPlaying]);

  useEffect(() => {
    let frame = 0;
    let running = true;

    const tick = () => {
      if (!running) return;

      const analyser = getAnalyser();
      const idle = idleBreath();

      let signals: Record<string, string> = {
        "--core-resonance": idle.toFixed(4),
        "--core-live": idle.toFixed(4),
        "--core-volume": idle.toFixed(4),
        "--core-mid": "0",
        "--core-beat-0": "0",
        "--core-beat-1": "0",
        "--core-beat-2": "0",
        "--core-beat-3": "0",
        "--core-beat": "0",
        "--core-warmth": "0",
      };

      if (!hudRef.current && stageRef.current) {
        hudRef.current = stageRef.current.querySelector(".hud-core");
      }

      if (isPlaying && analyser) {
        if (!engineRef.current) {
          engineRef.current = new CoreReactorEngine(analyser.frequencyBinCount);
          engineRef.current.setStation(stationRef.current);
        }

        const out = engineRef.current.update(analyser);

        signals = {
          "--core-resonance": out.live.toFixed(4),
          "--core-live": out.live.toFixed(4),
          "--core-volume": out.volume.toFixed(4),
          "--core-mid": out.mid.toFixed(4),
          "--core-beat-0": out.beat0.toFixed(4),
          "--core-beat-1": out.beat1.toFixed(4),
          "--core-beat-2": out.beat2.toFixed(4),
          "--core-beat-3": out.beat3.toFixed(4),
          "--core-beat": out.beat0.toFixed(4),
          "--core-warmth": out.mid.toFixed(4),
        };
      }

      applySignals([hudRef.current, stageRef.current, zoneRef.current], signals);

      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);

    return () => {
      running = false;
      cancelAnimationFrame(frame);
    };
  }, [getAnalyser, isPlaying]);

  const setStageRef = (node: HTMLDivElement | null) => {
    stageRef.current = node;
    zoneRef.current = node?.closest(".zone-center") ?? null;
    hudRef.current = node?.querySelector(".hud-core") ?? null;

    const initial = IDLE_BASE.toFixed(4);
    const defaults = {
      "--core-resonance": initial,
      "--core-live": initial,
      "--core-volume": initial,
      "--core-mid": "0",
      "--core-beat-0": "0",
      "--core-beat-1": "0",
      "--core-beat-2": "0",
      "--core-beat-3": "0",
      "--core-beat": "0",
      "--core-warmth": "0",
    };
    applySignals([node, zoneRef.current, hudRef.current], defaults);
  };

  return { setStageRef, isPlaying };
}
