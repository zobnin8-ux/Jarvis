"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type ModuleHealthId = "weather" | "calendar" | "space" | "briefing";

export type ModuleHealthState = "online" | "stale" | "offline";

export interface ModuleHealthEntry {
  state: ModuleHealthState;
  lastUpdated: number | null;
  error: string | null;
}

interface ModuleHealthContextValue {
  health: Partial<Record<ModuleHealthId, ModuleHealthEntry>>;
  reportHealth: (id: ModuleHealthId, entry: ModuleHealthEntry) => void;
}

const ModuleHealthContext = createContext<ModuleHealthContextValue | null>(null);

export { ModuleHealthContext };

export function ModuleHealthProvider({ children }: { children: ReactNode }) {
  const [health, setHealth] = useState<
    Partial<Record<ModuleHealthId, ModuleHealthEntry>>
  >({});

  const reportHealth = useCallback(
    (id: ModuleHealthId, entry: ModuleHealthEntry) => {
      setHealth((prev) => {
        const current = prev[id];
        if (
          current?.state === entry.state &&
          current?.lastUpdated === entry.lastUpdated &&
          current?.error === entry.error
        ) {
          return prev;
        }
        return { ...prev, [id]: entry };
      });
    },
    []
  );

  const value = useMemo(
    () => ({ health, reportHealth }),
    [health, reportHealth]
  );

  return (
    <ModuleHealthContext.Provider value={value}>
      {children}
    </ModuleHealthContext.Provider>
  );
}

export function useModuleHealthReporter() {
  const context = useContext(ModuleHealthContext);
  if (!context) {
    throw new Error(
      "useModuleHealthReporter must be used within ModuleHealthProvider"
    );
  }
  return context.reportHealth;
}

export function useModuleHealth() {
  const context = useContext(ModuleHealthContext);
  if (!context) {
    throw new Error("useModuleHealth must be used within ModuleHealthProvider");
  }
  return context.health;
}
