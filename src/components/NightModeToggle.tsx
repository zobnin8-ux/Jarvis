"use client";

import { useNightMode } from "@/context/NightModeContext";

export function NightModeToggle() {
  const { isNightMode, toggleNightMode } = useNightMode();

  return (
    <button
      type="button"
      className={`night-mode-toggle${isNightMode ? " is-night" : ""}`}
      onClick={toggleNightMode}
      aria-pressed={isNightMode}
      title={
        isNightMode
          ? "Ночной режим: реже опросы, анимации приглушены"
          : "Дневной режим: обычные обновления"
      }
    >
      <span className="night-mode-toggle-label">Режим</span>
      <span className="night-mode-toggle-value">
        {isNightMode ? "Ночь" : "День"}
      </span>
    </button>
  );
}
