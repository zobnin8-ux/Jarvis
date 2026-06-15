import type { ReactNode } from "react";

export type WeatherRailIconId =
  | "high"
  | "low"
  | "feels"
  | "sunrise"
  | "sunset"
  | "humid"
  | "wind"
  | "precip"
  | "aqi";

interface WeatherRailIconProps {
  id: WeatherRailIconId;
  className?: string;
}

export function WeatherRailIcon({ id, className = "" }: WeatherRailIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={20}
      height={20}
      className={`weather-rail-icon ${className}`.trim()}
      aria-hidden
    >
      {glyphs[id]}
    </svg>
  );
}

const stroke = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

const glyphs: Record<WeatherRailIconId, ReactNode> = {
  high: (
    <>
      <path {...stroke} d="M12 19V5M7 10l5-5 5 5" />
    </>
  ),
  low: (
    <>
      <path {...stroke} d="M12 5v14M7 14l5 5 5-5" />
    </>
  ),
  feels: (
    <>
      <path {...stroke} d="M14 4a4 4 0 0 0-4 4v8a3 3 0 1 0 6 0V8a4 4 0 0 0-4-4z" />
      <circle cx="10" cy="18" r="1.2" fill="currentColor" stroke="none" />
    </>
  ),
  sunrise: (
    <>
      <path {...stroke} d="M4 16h16M12 12V6M8.5 9.5 12 6l3.5 3.5" />
      <path {...stroke} d="M7 16a5 5 0 0 1 10 0" />
    </>
  ),
  sunset: (
    <>
      <path {...stroke} d="M4 14h16M12 10V4M8.5 7.5 12 4l3.5 3.5" />
      <path {...stroke} d="M7 14a5 5 0 0 0 10 0" />
    </>
  ),
  humid: (
    <>
      <path
        {...stroke}
        d="M12 3c-3 4.5-5 7.2-5 10a5 5 0 0 0 10 0c0-2.8-2-5.5-5-10z"
      />
    </>
  ),
  wind: (
    <>
      <path {...stroke} d="M4 8h11a3 3 0 1 0-3-3M4 12h14a3 3 0 1 1-3 3M4 16h9a2.5 2.5 0 1 0-2.5-2.5" />
    </>
  ),
  precip: (
    <>
      <path {...stroke} d="M8 4a4 4 0 0 1 7.5 2A3.5 3.5 0 0 1 19 12H7a3 3 0 1 1 1-8z" />
      <path {...stroke} d="M9 15v3M12 14v4M15 15v3" />
    </>
  ),
  aqi: (
    <>
      <path {...stroke} d="M4 14c1.5-2 3.2-3 5-3s3.5 1 5 3M6 17c1-1.5 2.2-2 3-2s2 .5 3 2" />
      <circle cx="12" cy="8" r="2" />
    </>
  ),
};
