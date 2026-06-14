import { logError, logWarn } from "@/lib/server/logger";

const GEOCODE_CACHE_MS = 10 * 60 * 1000;

interface GeocodeCacheEntry {
  label: string;
  expiresAt: number;
}

const geocodeCache = new Map<string, GeocodeCacheEntry>();

function cacheKey(lat: number, lon: number): string {
  return `${lat.toFixed(2)},${lon.toFixed(2)}`;
}

export async function reverseGeocodeIss(
  lat: number,
  lon: number
): Promise<string> {
  const key = cacheKey(lat, lon);
  const now = Date.now();
  const cached = geocodeCache.get(key);
  if (cached && cached.expiresAt > now) {
    return cached.label;
  }

  try {
    const url = new URL("https://geocoding-api.open-meteo.com/v1/reverse");
    url.searchParams.set("latitude", lat.toFixed(4));
    url.searchParams.set("longitude", lon.toFixed(4));
    url.searchParams.set("count", "1");
    url.searchParams.set("language", "en");
    url.searchParams.set("format", "json");

    const response = await fetch(url.toString(), {
      headers: { "User-Agent": "Jarvis-Command-Center/1.0" },
      next: { revalidate: 600 },
    });

    if (!response.ok) {
      logWarn("iss-geocode", `HTTP ${response.status}`);
      return cached?.label ?? formatCoordFallback(lat, lon);
    }

    const json = (await response.json()) as {
      results?: Array<{
        name?: string;
        admin1?: string;
        country?: string;
      }>;
    };

    const place = json.results?.[0];
    if (!place?.name) {
      return cached?.label ?? formatCoordFallback(lat, lon);
    }

    const parts = [place.name, place.admin1, place.country].filter(Boolean);
    const label = parts.join(", ");
    geocodeCache.set(key, { label, expiresAt: now + GEOCODE_CACHE_MS });
    return label;
  } catch (err) {
    logError("iss-geocode", err);
    return cached?.label ?? formatCoordFallback(lat, lon);
  }
}

function formatCoordFallback(lat: number, lon: number): string {
  const latH = `${Math.abs(lat).toFixed(2)}°${lat >= 0 ? "N" : "S"}`;
  const lonH = `${Math.abs(lon).toFixed(2)}°${lon >= 0 ? "E" : "W"}`;
  return `${latH} · ${lonH}`;
}
