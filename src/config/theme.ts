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
