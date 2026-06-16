import type { WeatherData } from "@/types/modules";
import { fetchApiData } from "@/lib/client/apiFetch";

export async function fetchWeather(lat: number, lon: number): Promise<WeatherData> {
  const params = new URLSearchParams({
    lat: String(lat),
    lon: String(lon),
  });
  return fetchApiData<WeatherData>(`/api/weather?${params.toString()}`);
}
