"use client";

import { useEffect } from "react";
import { getCircadianPalette } from "@/config/theme";
import { useNightMode } from "@/context/NightModeContext";

const SHELL_VARS = [
  "color-accent",
  "color-secondary",
  "label-color",
  "panel-border",
  "ambient-glow",
  "divider-color",
  "panel-glow-top",
  "weather-panel-border",
  "side-panel-border",
  "bottom-panel-border",
] as const;

function applyPalette(shell: HTMLElement): void {
  const palette = getCircadianPalette();
  shell.dataset.circadian = palette.phase;
  shell.style.setProperty("--color-accent", palette.accent);
  shell.style.setProperty("--color-secondary", palette.secondary);
  shell.style.setProperty("--label-color", palette.labelColor);
  shell.style.setProperty("--panel-border", palette.panelBorder);
  shell.style.setProperty("--ambient-glow", palette.ambientGlow);
  shell.style.setProperty(
    "--divider-color",
    palette.panelBorder.replace("0.14", "0.22").replace("0.16", "0.22")
  );
  shell.style.setProperty("--panel-glow-top", palette.ambientGlow);
  shell.style.setProperty("--weather-panel-border", palette.panelBorder);
  shell.style.setProperty("--side-panel-border", palette.panelBorder);
  shell.style.setProperty("--bottom-panel-border", palette.panelBorder);
}

export function CircadianThemeController() {
  const { isNightMode } = useNightMode();

  useEffect(() => {
    const shell = document.querySelector(".command-shell");
    if (!(shell instanceof HTMLElement)) return;

    applyPalette(shell);
    if (isNightMode) return;

    const timer = setInterval(() => applyPalette(shell), 60_000);
    return () => clearInterval(timer);
  }, [isNightMode]);

  useEffect(() => {
    return () => {
      const shell = document.querySelector(".command-shell");
      if (!(shell instanceof HTMLElement)) return;
      for (const key of SHELL_VARS) {
        shell.style.removeProperty(`--${key}`);
      }
      delete shell.dataset.circadian;
    };
  }, []);

  return null;
}
