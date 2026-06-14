import type { WeatherData } from "@/types/modules";

export type WeatherMood =
  | "sunny"
  | "cloudy"
  | "rain"
  | "sunset"
  | "night"
  | "snow"
  | "mist";

type IconCategory = "clear" | "cloud" | "rain" | "storm" | "snow" | "mist";

function getIconCategory(icon: string): IconCategory {
  const code = icon.slice(0, 2);
  if (code === "11") return "storm";
  if (code === "09" || code === "10") return "rain";
  if (code === "13") return "snow";
  if (code === "50") return "mist";
  if (code === "02" || code === "03" || code === "04") return "cloud";
  return "clear";
}

function isNearSunset(sunset: string): boolean {
  const [h, m] = sunset.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return false;

  const now = new Date();
  const sunsetDate = new Date(now);
  sunsetDate.setHours(h, m, 0, 0);

  const diffMs = sunsetDate.getTime() - now.getTime();
  return diffMs <= 2 * 60 * 60 * 1000 && diffMs >= -30 * 60 * 1000;
}

export function resolveWeatherMood(
  data: Pick<WeatherData, "icon" | "sunset">
): WeatherMood {
  const category = getIconCategory(data.icon);
  const isNight = data.icon.endsWith("n");

  if (
    isNearSunset(data.sunset) &&
    (category === "clear" || category === "cloud")
  ) {
    return "sunset";
  }
  if (category === "rain" || category === "storm") return "rain";
  if (category === "snow") return "snow";
  if (category === "mist") return "mist";
  if (category === "cloud") return "cloudy";
  if (isNight) return "night";
  return "sunny";
}

function dayPeriod(hour: number): "morning" | "afternoon" | "evening" {
  if (hour >= 5 && hour < 12) return "morning";
  if (hour >= 12 && hour < 17) return "afternoon";
  return "evening";
}

function isNightPeriod(hour: number): boolean {
  return hour < 5 || hour >= 22;
}

/** Primary day status — readable at a glance */
export function getWeatherDayStatus(data: WeatherData): string {
  const hour = new Date().getHours();
  const period = dayPeriod(hour);
  const category = getIconCategory(data.icon);
  const mood = resolveWeatherMood(data);
  const { temperature, windSpeed, precipChance } = data;
  const isNight = isNightPeriod(hour) || data.icon.endsWith("n");

  if (mood === "sunset") return "GOLDEN HOUR";
  if (windSpeed >= 8) return isNight ? "WINDY NIGHT" : "WINDY DAY";

  if (category === "rain" || category === "storm") {
    if (isNight) return "NIGHT RAIN";
    if (period === "evening" && temperature < 14) return "COLD EVENING";
    return "LIGHT RAIN EXPECTED";
  }

  if (category === "snow") return isNight ? "QUIET SNOW" : "QUIET SNOW";
  if (category === "mist") return isNight ? "MISTY NIGHT" : "MISTY AIR";

  if (isNight) {
    if (category === "cloud") return "CLOUDY NIGHT";
    if (temperature < 10) return "COLD NIGHT";
    return "CLEAR NIGHT";
  }

  if (precipChance >= 50 && category === "cloud") {
    return "LIGHT RAIN EXPECTED";
  }

  if (category === "cloud") {
    if (period === "morning") return "CLOUDY MORNING";
    return "CLOUDY SKY";
  }

  if (period === "morning" && temperature < 14) return "COOL MORNING";
  if (period === "morning") return "CLEAR MORNING";
  if (period === "afternoon" && temperature >= 30) return "HOT AFTERNOON";
  if (period === "afternoon" && category === "clear") return "SUNNY AFTERNOON";
  if (period === "evening" && temperature < 12) return "COLD EVENING";
  if (period === "evening") return "CLEAR EVENING";

  if (temperature >= 18 && temperature <= 28) return "PERFECT DAY";
  if (temperature > 28) return "HOT AFTERNOON";
  if (temperature < 10) return "COLD EVENING";

  return "CLEAR SKY";
}

/** @deprecated use getWeatherDayStatus */
export function getWeatherDayMessage(data: WeatherData): string {
  return getWeatherDayStatus(data);
}

const POETRY: Record<WeatherMood, string[]> = {
  sunny: [
    "Warm light beyond the glass",
    "The sky holds steady and open",
    "Clear air, unhurried morning",
  ],
  cloudy: [
    "Soft light, muted horizon",
    "Clouds drift at their own pace",
    "A quiet lid over the valley",
  ],
  rain: [
    "Rain writes slow lines outside",
    "The world turns inward today",
    "Soft weather, softened edges",
  ],
  sunset: [
    "Light holds a little longer",
    "Gold bleeds into the horizon",
    "The day exhales in amber",
  ],
  night: [
    "Cold clarity under stars",
    "The night air is still",
    "Dark sky, distant signals",
  ],
  snow: [
    "Silence settles in white",
    "The air feels carved and clean",
    "Quiet falls without sound",
  ],
  mist: [
    "Distance dissolves in grey",
    "The world seen through gauze",
    "Soft edges, softened sound",
  ],
};

export function getWeatherPoetryLine(
  mood: WeatherMood,
  data: WeatherData
): string {
  const pool = POETRY[mood];
  const seed =
    new Date().getDate() + data.temperature + mood.length + new Date().getHours();
  return pool[seed % pool.length];
}
