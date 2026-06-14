"use client";

import { useCoreResonance } from "@/context/CoreResonanceContext";

/** @deprecated Use useCoreResonance — kept for AmbientAudioModule compatibility */
export function useRadioPlayer() {
  const { station, stations, isPlaying, track, play, pause, setStation } =
    useCoreResonance();

  return { station, stations, isPlaying, track, play, pause, setStation };
}
