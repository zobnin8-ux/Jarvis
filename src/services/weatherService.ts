import type { WeatherData } from "@/types/modules";
import { fetchApiData } from "@/lib/client/apiFetch";

export async function fetchWeather(): Promise<WeatherData> {
  return fetchApiData<WeatherData>("/api/weather");
}
