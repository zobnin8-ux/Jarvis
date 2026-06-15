"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  cycleNightModePreference,
  NIGHT_MODE_PREFERENCE_KEY,
  NIGHT_MODE_STORAGE_KEY,
  readNightScheduleConfig,
  type NightModePreference,
} from "@/config/nightMode";
import {
  isNightBySchedule,
  msUntilNextScheduleBoundary,
} from "@/lib/nightSchedule";

interface NightModeContextValue {
  isNightMode: boolean;
  preference: NightModePreference;
  cycleNightMode: () => void;
  /** @deprecated Use cycleNightMode — maps to forced day/night */
  toggleNightMode: () => void;
  setNightMode: (value: boolean) => void;
}

const NightModeContext = createContext<NightModeContextValue | null>(null);

function readStoredPreference(): NightModePreference {
  if (typeof window === "undefined") return "auto";
  try {
    const stored = localStorage.getItem(NIGHT_MODE_PREFERENCE_KEY);
    if (stored === "auto" || stored === "day" || stored === "night") {
      return stored;
    }

    const legacy = localStorage.getItem(NIGHT_MODE_STORAGE_KEY);
    if (legacy === "true") return "night";
    if (legacy === "false") return "auto";

    return "auto";
  } catch {
    return "auto";
  }
}

function persistPreference(preference: NightModePreference) {
  try {
    localStorage.setItem(NIGHT_MODE_PREFERENCE_KEY, preference);
    localStorage.removeItem(NIGHT_MODE_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

function resolveEffectiveNight(
  preference: NightModePreference,
  scheduleTick: number
): boolean {
  void scheduleTick;
  if (preference === "night") return true;
  if (preference === "day") return false;
  const schedule = readNightScheduleConfig();
  return isNightBySchedule(new Date(), schedule);
}

export function NightModeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreference] = useState<NightModePreference>(
    readStoredPreference
  );
  const [scheduleTick, setScheduleTick] = useState(0);

  const isNightMode = resolveEffectiveNight(preference, scheduleTick);

  const setPreferencePersisted = useCallback((next: NightModePreference) => {
    setPreference(next);
    persistPreference(next);
  }, []);

  const cycleNightMode = useCallback(() => {
    setPreferencePersisted(cycleNightModePreference(preference));
  }, [preference, setPreferencePersisted]);

  const setNightMode = useCallback(
    (value: boolean) => {
      setPreferencePersisted(value ? "night" : "day");
    },
    [setPreferencePersisted]
  );

  useEffect(() => {
    if (preference !== "auto") return;

    const schedule = readNightScheduleConfig();
    let timer: ReturnType<typeof setTimeout>;

    const arm = () => {
      const delay = Math.max(
        1_000,
        msUntilNextScheduleBoundary(new Date(), schedule)
      );
      timer = setTimeout(() => {
        setScheduleTick((t) => t + 1);
        arm();
      }, delay);
    };

    arm();
    const minute = setInterval(() => setScheduleTick((t) => t + 1), 60_000);

    return () => {
      clearTimeout(timer);
      clearInterval(minute);
    };
  }, [preference]);

  const value = useMemo(
    () => ({
      isNightMode,
      preference,
      cycleNightMode,
      toggleNightMode: cycleNightMode,
      setNightMode,
    }),
    [cycleNightMode, isNightMode, preference, setNightMode]
  );

  return (
    <NightModeContext.Provider value={value}>{children}</NightModeContext.Provider>
  );
}

export function useNightMode(): NightModeContextValue {
  const ctx = useContext(NightModeContext);
  if (!ctx) {
    throw new Error("useNightMode must be used within NightModeProvider");
  }
  return ctx;
}
