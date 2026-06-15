"use client";

import {
  readNightScheduleConfig,
  type NightModePreference,
} from "@/config/nightMode";
import { useNightMode } from "@/context/NightModeContext";

function toggleLabel(preference: NightModePreference, isNightMode: boolean): string {
  if (preference === "auto") {
    return isNightMode ? "Авто · Ночь" : "Авто · День";
  }
  return preference === "night" ? "Ночь" : "День";
}

function toggleTitle(preference: NightModePreference): string {
  const { startHour, endHour } = readNightScheduleConfig();
  const schedule = `ночь ${startHour}:00–${endHour}:00 по локальному времени`;

  if (preference === "auto") {
    return `Авто (${schedule}). Клик: День → Ночь → Авто`;
  }
  if (preference === "day") {
    return "День вручную (API активны). Клик: Ночь";
  }
  return `Ночь вручную (без API). Клик: Авто (${schedule})`;
}

export function NightModeToggle() {
  const { isNightMode, preference, cycleNightMode } = useNightMode();
  const label = toggleLabel(preference, isNightMode);

  return (
    <button
      type="button"
      className={`night-mode-toggle${isNightMode ? " is-night" : ""}${preference === "auto" ? " is-auto" : ""}`}
      onClick={cycleNightMode}
      aria-pressed={isNightMode}
      title={toggleTitle(preference)}
    >
      <span className="night-mode-toggle-label">Режим</span>
      <span className="night-mode-toggle-value">{label}</span>
    </button>
  );
}
