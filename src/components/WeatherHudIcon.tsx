import type { WeatherMood } from "@/lib/weatherMood";

export type WeatherIconVariant = WeatherMood | "storm";

function iconFromCode(icon: string): WeatherIconVariant {
  const code = icon.slice(0, 2);
  if (code === "11") return "storm";
  if (code === "09" || code === "10") return "rain";
  if (code === "13") return "snow";
  if (code === "50") return "mist";
  if (code === "02" || code === "03" || code === "04") return "cloudy";
  if (icon.endsWith("n")) return "night";
  return "sunny";
}

interface WeatherHudIconProps {
  icon?: string;
  mood?: WeatherMood;
  size?: "hero" | "sm";
  className?: string;
}

export function WeatherHudIcon({
  icon,
  mood,
  size = "hero",
  className = "",
}: WeatherHudIconProps) {
  const variant: WeatherIconVariant =
    mood === "sunset"
      ? "sunset"
      : icon
        ? iconFromCode(icon)
        : mood ?? "cloudy";
  const dim = size === "hero" ? 120 : 22;

  return (
    <svg
      viewBox="0 0 120 120"
      width={dim}
      height={dim}
      className={`weather-hud-icon weather-hud-icon--${variant} weather-hud-icon--${size} ${className}`}
      aria-hidden
    >
      {variant === "sunny" && <SunnyGlyph />}
      {variant === "cloudy" && <CloudyGlyph />}
      {variant === "rain" && <RainGlyph />}
      {variant === "storm" && <StormGlyph />}
      {variant === "sunset" && <SunsetGlyph />}
      {variant === "night" && <NightGlyph />}
      {variant === "snow" && <SnowGlyph />}
      {variant === "mist" && <MistGlyph />}
    </svg>
  );
}

function SunnyGlyph() {
  return (
    <>
      <circle cx="60" cy="60" r="22" className="weather-glyph-core" />
      {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
        <line
          key={deg}
          x1="60"
          y1="60"
          x2="60"
          y2="28"
          className="weather-glyph-ray"
          transform={`rotate(${deg} 60 60)`}
        />
      ))}
    </>
  );
}

function CloudyGlyph() {
  return (
    <>
      <path
        d="M34 68c0-14 11-24 25-24 3 0 6 .5 9 1.5 5-10 16-16 28-16 17 0 31 13 31 30 0 2-.2 4-.6 6H38c-6 0-10-4-10-9 0-5 4-9 6-12z"
        className="weather-glyph-cloud"
      />
      <path
        d="M22 78c0-10 8-18 18-18 2 0 4 .3 6 1 3-7 11-12 20-12 12 0 22 9 22 22"
        className="weather-glyph-cloud weather-glyph-cloud-back"
      />
    </>
  );
}

function RainGlyph() {
  return (
    <>
      <path
        d="M30 58c0-14 11-24 25-24 4 0 7 1 10 2 5-9 15-15 27-15 16 0 28 12 28 28 0 1 0 3-.2 4H32c-5 0-9-4-9-8 0-4 3-7 7-7z"
        className="weather-glyph-cloud"
      />
      {[44, 58, 72, 86].map((x) => (
        <line
          key={x}
          x1={x}
          y1="78"
          x2={x - 4}
          y2="98"
          className="weather-glyph-rain"
        />
      ))}
    </>
  );
}

function StormGlyph() {
  return (
    <>
      <path
        d="M28 54c0-13 10-22 23-22 3 0 6 .5 9 1.5 4-9 14-15 26-15 15 0 27 11 27 26 0 1 0 2-.1 3H30c-5 0-8-3-8-7 0-3 3-6 6-6z"
        className="weather-glyph-cloud"
      />
      <path d="M58 72 L50 92 H58 L52 108" className="weather-glyph-bolt" />
    </>
  );
}

function SunsetGlyph() {
  return (
    <>
      <line x1="20" y1="78" x2="100" y2="78" className="weather-glyph-horizon" />
      <path d="M60 78 A26 26 0 0 1 34 78" className="weather-glyph-core" />
      <path d="M20 78 Q60 48 100 78" className="weather-glyph-glow-arc" />
    </>
  );
}

function NightGlyph() {
  return (
    <>
      <path
        d="M72 34c-16 2-28 16-28 32 0 18 14 32 32 32 10 0 19-4 25-12-14 2-28-10-28-26 0-10 5-18 13-24-4-1-9-2-14-2z"
        className="weather-glyph-moon"
      />
      <circle cx="38" cy="42" r="1.5" className="weather-glyph-star" />
      <circle cx="88" cy="36" r="1.2" className="weather-glyph-star" />
      <circle cx="92" cy="58" r="1" className="weather-glyph-star" />
    </>
  );
}

function SnowGlyph() {
  return (
    <>
      <path
        d="M32 58c0-12 10-21 22-21 3 0 6 .4 8 1.2 4-8 13-13 24-13 14 0 26 10 26 24 0 1 0 2-.1 3H34c-4 0-7-3-7-6 0-3 2-5 5-5z"
        className="weather-glyph-cloud"
      />
      {[
        [42, 86],
        [58, 92],
        [74, 86],
        [90, 94],
      ].map(([x, y]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r="2.2" className="weather-glyph-snow" />
      ))}
    </>
  );
}

function MistGlyph() {
  return (
    <>
      {[48, 60, 72].map((y) => (
        <line
          key={y}
          x1="24"
          y1={y}
          x2="96"
          y2={y}
          className="weather-glyph-mist"
        />
      ))}
    </>
  );
}
