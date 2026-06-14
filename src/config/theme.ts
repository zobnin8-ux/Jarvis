export type ThemeName = "nasa" | "jarvis" | "minimal";

/** Switch visual theme here — no UI toggle needed yet */
export const THEME: ThemeName = "jarvis";

export interface ThemeTokens {
  name: ThemeName;
  label: string;
}

export const THEMES: Record<ThemeName, ThemeTokens> = {
  nasa: { name: "nasa", label: "NASA" },
  jarvis: { name: "jarvis", label: "JARVIS" },
  minimal: { name: "minimal", label: "Minimal" },
};

/** Circadian palette — shell/UI only; core zone uses fixed JARVIS tokens in CSS */
export type CircadianPhase = "night" | "dawn" | "day" | "dusk";

export interface CircadianPalette {
  phase: CircadianPhase;
  accent: string;
  secondary: string;
  labelColor: string;
  panelBorder: string;
  ambientGlow: string;
}

const CIRCADIAN_STOPS: Record<CircadianPhase, Omit<CircadianPalette, "phase">> = {
  night: {
    accent: "#c9a56a",
    secondary: "#e8a87c",
    labelColor: "rgba(232, 168, 124, 0.58)",
    panelBorder: "rgba(201, 165, 106, 0.16)",
    ambientGlow: "rgba(201, 165, 106, 0.06)",
  },
  dawn: {
    accent: "#7eb8d4",
    secondary: "#f0b87a",
    labelColor: "rgba(126, 184, 212, 0.58)",
    panelBorder: "rgba(126, 184, 212, 0.14)",
    ambientGlow: "rgba(240, 184, 122, 0.05)",
  },
  day: {
    accent: "#55d6ff",
    secondary: "#ffb84d",
    labelColor: "rgba(85, 214, 255, 0.62)",
    panelBorder: "rgba(85, 214, 255, 0.14)",
    ambientGlow: "rgba(85, 214, 255, 0.07)",
  },
  dusk: {
    accent: "#8ec4e8",
    secondary: "#f5a962",
    labelColor: "rgba(245, 169, 98, 0.58)",
    panelBorder: "rgba(142, 196, 232, 0.13)",
    ambientGlow: "rgba(245, 169, 98, 0.06)",
  },
};

function parseHex(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

function lerpColor(a: string, b: string, t: number): string {
  const [ar, ag, ab] = parseHex(a);
  const [br, bg, bb] = parseHex(b);
  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const bl = Math.round(ab + (bb - ab) * t);
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${bl.toString(16).padStart(2, "0")}`;
}

function lerpRgba(a: string, b: string, t: number): string {
  return `color-mix(in srgb, ${a} ${Math.round((1 - t) * 100)}%, ${b})`;
}

/** Hour 0–24 → blended circadian palette */
export function getCircadianPalette(date: Date = new Date()): CircadianPalette {
  const hour = date.getHours() + date.getMinutes() / 60;

  if (hour >= 22 || hour < 5) {
    const t = hour >= 22 ? (hour - 22) / 3 : hour < 2 ? 1 : (5 - hour) / 3;
    const blend = hour >= 22 ? Math.min(1, t) : Math.min(1, t);
    const from = CIRCADIAN_STOPS.dusk;
    const to = CIRCADIAN_STOPS.night;
    return {
      phase: blend > 0.5 ? "night" : "dusk",
      accent: lerpColor(from.accent, to.accent, blend),
      secondary: lerpColor(from.secondary, to.secondary, blend),
      labelColor: lerpRgba(from.labelColor, to.labelColor, blend),
      panelBorder: lerpRgba(from.panelBorder, to.panelBorder, blend),
      ambientGlow: lerpRgba(from.ambientGlow, to.ambientGlow, blend),
    };
  }

  if (hour >= 5 && hour < 8) {
    const t = (hour - 5) / 3;
    const from = CIRCADIAN_STOPS.night;
    const to = CIRCADIAN_STOPS.dawn;
    return {
      phase: t > 0.5 ? "dawn" : "night",
      accent: lerpColor(from.accent, to.accent, t),
      secondary: lerpColor(from.secondary, to.secondary, t),
      labelColor: lerpRgba(from.labelColor, to.labelColor, t),
      panelBorder: lerpRgba(from.panelBorder, to.panelBorder, t),
      ambientGlow: lerpRgba(from.ambientGlow, to.ambientGlow, t),
    };
  }

  if (hour >= 8 && hour < 17) {
    const t = hour < 12 ? (hour - 8) / 4 : 1 - (hour - 12) / 5;
    const from = CIRCADIAN_STOPS.dawn;
    const to = CIRCADIAN_STOPS.day;
    return {
      phase: "day",
      accent: lerpColor(from.accent, to.accent, Math.min(1, t)),
      secondary: lerpColor(from.secondary, to.secondary, Math.min(1, t)),
      labelColor: lerpRgba(from.labelColor, to.labelColor, Math.min(1, t)),
      panelBorder: lerpRgba(from.panelBorder, to.panelBorder, Math.min(1, t)),
      ambientGlow: lerpRgba(from.ambientGlow, to.ambientGlow, Math.min(1, t)),
    };
  }

  const t = (hour - 17) / 5;
  const from = CIRCADIAN_STOPS.day;
  const to = CIRCADIAN_STOPS.dusk;
  return {
    phase: t > 0.5 ? "dusk" : "day",
    accent: lerpColor(from.accent, to.accent, t),
    secondary: lerpColor(from.secondary, to.secondary, t),
    labelColor: lerpRgba(from.labelColor, to.labelColor, t),
    panelBorder: lerpRgba(from.panelBorder, to.panelBorder, t),
    ambientGlow: lerpRgba(from.ambientGlow, to.ambientGlow, t),
  };
}

export const CORE_ZONE_LOCKED = {
  accent: "#55d6ff",
  secondary: "#ffb84d",
  coreGlow: "rgba(85, 214, 255, 0.12)",
  coreGlowOuter: "rgba(85, 214, 255, 0.07)",
} as const;
