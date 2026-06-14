"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  RADIO_AUTO_RESTORE,
  RADIO_PLAYING_KEY,
  RADIO_STATIONS,
  RADIO_STORAGE_KEY,
  type RadioStation,
} from "@/config/radio";
import { createAnalyserContext, wireAudioAnalysis } from "@/lib/audioAnalysis";
import { fetchRadioMetadata } from "@/services/radioService";

export type CoreMode = "idle" | "active";

interface CoreResonanceContextValue {
  coreMode: CoreMode;
  station: RadioStation;
  stations: RadioStation[];
  isPlaying: boolean;
  track: string | null;
  play: () => void;
  pause: () => void;
  setStation: (station: RadioStation) => void;
  getAnalyser: () => AnalyserNode | null;
}

const CoreResonanceContext = createContext<CoreResonanceContextValue | null>(
  null
);

function loadStoredStation(): RadioStation {
  if (typeof window === "undefined") return RADIO_STATIONS[0];

  const stored = localStorage.getItem(RADIO_STORAGE_KEY);
  return RADIO_STATIONS.find((s) => s.id === stored) ?? RADIO_STATIONS[0];
}

function loadStoredPlaying(): boolean {
  if (typeof window === "undefined" || !RADIO_AUTO_RESTORE) return false;
  return localStorage.getItem(RADIO_PLAYING_KEY) === "true";
}

export function CoreResonanceProvider({ children }: { children: ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const analysisReadyRef = useRef(false);

  const [station, setStationState] = useState<RadioStation>(RADIO_STATIONS[0]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [track, setTrack] = useState<string | null>(null);

  const coreMode: CoreMode = isPlaying ? "active" : "idle";

  const persist = useCallback((nextStation: RadioStation, playing: boolean) => {
    localStorage.setItem(RADIO_STORAGE_KEY, nextStation.id);
    localStorage.setItem(RADIO_PLAYING_KEY, playing ? "true" : "false");
  }, []);

  const getAnalyser = useCallback(() => analyserRef.current, []);

  const teardownAnalysis = useCallback(() => {
    void audioContextRef.current?.close();
    audioContextRef.current = null;
    analyserRef.current = null;
    analysisReadyRef.current = false;
  }, []);

  const createAudioElement = useCallback(() => {
    const audio = new Audio();
    audio.crossOrigin = "anonymous";
    audio.preload = "none";

    const syncPlaying = () => setIsPlaying(!audio.paused);
    audio.addEventListener("play", syncPlaying);
    audio.addEventListener("pause", syncPlaying);

    audioRef.current = audio;
    return audio;
  }, []);

  const connectAudioGraph = useCallback((audio: HTMLAudioElement): boolean => {
    if (analysisReadyRef.current && analyserRef.current) {
      void audioContextRef.current?.resume();
      return true;
    }

    try {
      const { context, analyser } = createAnalyserContext();
      const wired = wireAudioAnalysis(context, analyser, audio);
      if (!wired) return false;
      audioContextRef.current = context;
      analyserRef.current = analyser;
      analysisReadyRef.current = true;
      void context.resume();
      return true;
    } catch {
      teardownAnalysis();
      return false;
    }
  }, [teardownAnalysis]);

  const ensureAudioAnalysis = useCallback(
    (audio: HTMLAudioElement) => {
      let attempts = 0;

      const attach = () => {
        const connected = connectAudioGraph(audio);
        if (!connected && attempts < 12) {
          attempts += 1;
          window.setTimeout(attach, 150);
          return;
        }
        void audioContextRef.current?.resume();
      };

      if (!audio.paused && audio.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
        attach();
        return;
      }

      audio.addEventListener("playing", attach, { once: true });
    },
    [connectAudioGraph]
  );

  const loadMetadata = useCallback(async (stationId: string) => {
    const data = await fetchRadioMetadata(stationId);
    setTrack(data.track);
  }, []);

  const playStream = useCallback(
    async (target: RadioStation) => {
      const audio = audioRef.current;
      if (!audio) return;

      audio.src = target.streamUrl;
      audio.load();

      try {
        await audio.play();
        ensureAudioAnalysis(audio);
        setIsPlaying(true);
        persist(target, true);
        loadMetadata(target.id);
      } catch {
        setIsPlaying(false);
        persist(target, false);
      }
    },
    [ensureAudioAnalysis, loadMetadata, persist]
  );

  const pause = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.pause();
    setIsPlaying(false);
    persist(station, false);
  }, [persist, station]);

  const play = useCallback(() => {
    playStream(station);
  }, [playStream, station]);

  const setStation = useCallback(
    (next: RadioStation) => {
      setStationState(next);
      setTrack(null);
      persist(next, isPlaying);

      if (isPlaying) {
        playStream(next);
      } else {
        loadMetadata(next.id);
      }
    },
    [isPlaying, loadMetadata, persist, playStream]
  );

  useEffect(() => {
    const audio = createAudioElement();

    const initial = loadStoredStation();
    setStationState(initial);

    if (loadStoredPlaying()) {
      audio.src = initial.streamUrl;
      audio
        .play()
        .then(() => {
          ensureAudioAnalysis(audio);
          setIsPlaying(true);
          loadMetadata(initial.id);
        })
        .catch(() => {
          setIsPlaying(false);
          persist(initial, false);
        });
    } else {
      loadMetadata(initial.id);
    }

    return () => {
      audio.pause();
      audioRef.current = null;
      teardownAnalysis();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!isPlaying) return;

    loadMetadata(station.id);
    const timer = setInterval(() => loadMetadata(station.id), 30_000);
    return () => clearInterval(timer);
  }, [isPlaying, loadMetadata, station.id]);

  return (
    <CoreResonanceContext.Provider
      value={{
        coreMode,
        station,
        stations: RADIO_STATIONS,
        isPlaying,
        track,
        play,
        pause,
        setStation,
        getAnalyser,
      }}
    >
      {children}
    </CoreResonanceContext.Provider>
  );
}

export function useCoreResonance() {
  const context = useContext(CoreResonanceContext);
  if (!context) {
    throw new Error("useCoreResonance must be used within CoreResonanceProvider");
  }
  return context;
}
