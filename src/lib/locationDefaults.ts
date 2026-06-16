export const DEFAULT_WEATHER_LAT = 37.338207;
export const DEFAULT_WEATHER_LON = -121.88633;

export function resolveLocationCoords(): { lat: number; lon: number; label: string } {
  const lat = Number.parseFloat(process.env.WEATHER_LAT ?? String(DEFAULT_WEATHER_LAT));
  const lon = Number.parseFloat(process.env.WEATHER_LON ?? String(DEFAULT_WEATHER_LON));
  const label = (
    process.env.NEXT_PUBLIC_WEATHER_CITY ??
    process.env.WEATHER_CITY ??
    "San Jose"
  ).toUpperCase();

  return {
    lat: Number.isFinite(lat) ? lat : DEFAULT_WEATHER_LAT,
    lon: Number.isFinite(lon) ? lon : DEFAULT_WEATHER_LON,
    label,
  };
}

export function formatLocationCacheKey(lat: number, lon: number): string {
  return `${lat.toFixed(2)}_${lon.toFixed(2)}`;
}
