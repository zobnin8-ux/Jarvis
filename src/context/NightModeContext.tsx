"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { NIGHT_MODE_STORAGE_KEY } from "@/config/nightMode";

interface NightModeContextValue {
  isNightMode: boolean;
  toggleNightMode: () => void;
  setNightMode: (value: boolean) => void;
}

const NightModeContext = createContext<NightModeContextValue | null>(null);

function readStoredNightMode(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(NIGHT_MODE_STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

export function NightModeProvider({ children }: { children: ReactNode }) {
  const [isNightMode, setIsNightMode] = useState(
    () => typeof window !== "undefined" && readStoredNightMode()
  );

  const setNightMode = useCallback((value: boolean) => {
    setIsNightMode(value);
    try {
      localStorage.setItem(NIGHT_MODE_STORAGE_KEY, value ? "true" : "false");
    } catch {
      /* ignore */
    }
  }, []);

  const value = useMemo(
    () => ({
      isNightMode,
      toggleNightMode: () => {
        setNightMode(!isNightMode);
      },
      setNightMode,
    }),
    [isNightMode, setNightMode]
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
