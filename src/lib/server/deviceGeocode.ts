import { logError, logWarn } from "@/lib/server/logger";

const GEOCODE_CACHE_MS = 30 * 60 * 1000;

interface GeocodeCacheEntry {
  label: string;
  expiresAt: number;
}

const geocodeCache = new Map<string, GeocodeCacheEntry>();

function cacheKey(lat: number, lon: number): string {
  return `${lat.toFixed(3)},${lon.toFixed(3)}`;
}

function formatCoordLabel(lat: number, lon: number): string {
  const latH = `${Math.abs(lat).toFixed(2)}°${lat >= 0 ? "N" : "S"}`;
  const lonH = `${Math.abs(lon).toFixed(2)}°${lon >= 0 ? "E" : "W"}`;
  return `${latH} ${lonH}`;
}

function pickPlaceName(address: Record<string, string | undefined>): string | null {
  const city =
    address.city ??
    address.town ??
    address.village ??
    address.municipality ??
    address.suburb ??
    address.county;

  if (!city) return null;

  const region = address.state ?? address.region;
  if (region && region !== city) {
    return `${city}, ${region}`;
  }
  return city;
}

async function reverseGeocodeNominatim(
  lat: number,
  lon: number
): Promise<string | null> {
  const url = new URL("https://nominatim.openstreetmap.org/reverse");
  url.searchParams.set("lat", lat.toFixed(6));
  url.searchParams.set("lon", lon.toFixed(6));
  url.searchParams.set("format", "json");
  url.searchParams.set("zoom", "12");
  url.searchParams.set("addressdetails", "1");

  const response = await fetch(url.toString(), {
    headers: {
      "User-Agent": "Jarvis-Command-Center/1.0 (local dashboard)",
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    logWarn("device-geocode", `Nominatim HTTP ${response.status}`);
    return null;
  }

  const json = (await response.json()) as {
    address?: Record<string, string | undefined>;
    display_name?: string;
  };

  if (json.address) {
    const place = pickPlaceName(json.address);
    if (place) return place;
  }

  if (json.display_name) {
    const short = json.display_name.split(",").slice(0, 2).join(",").trim();
    if (short) return short;
  }

  return null;
}

async function reverseGeocodeOpenMeteo(
  lat: number,
  lon: number
): Promise<string | null> {
  const url = new URL("https://geocoding-api.open-meteo.com/v1/reverse");
  url.searchParams.set("latitude", lat.toFixed(4));
  url.searchParams.set("longitude", lon.toFixed(4));
  url.searchParams.set("count", "1");
  url.searchParams.set("language", "en");
  url.searchParams.set("format", "json");

  const response = await fetch(url.toString(), {
    headers: { "User-Agent": "Jarvis-Command-Center/1.0" },
    cache: "no-store",
  });

  if (!response.ok) {
    logWarn("device-geocode", `Open-Meteo HTTP ${response.status}`);
    return null;
  }

  const json = (await response.json()) as {
    results?: Array<{ name?: string; admin1?: string }>;
  };

  const place = json.results?.[0];
  if (!place?.name) return null;

  if (place.admin1 && place.admin1 !== place.name) {
    return `${place.name}, ${place.admin1}`;
  }
  return place.name;
}

export async function reverseGeocodeDevice(
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
    const nominatim = await reverseGeocodeNominatim(lat, lon);
    if (nominatim) {
      geocodeCache.set(key, { label: nominatim, expiresAt: now + GEOCODE_CACHE_MS });
      return nominatim;
    }

    const meteo = await reverseGeocodeOpenMeteo(lat, lon);
    if (meteo) {
      geocodeCache.set(key, { label: meteo, expiresAt: now + GEOCODE_CACHE_MS });
      return meteo;
    }
  } catch (err) {
    logError("device-geocode", err);
  }

  const fallback = formatCoordLabel(lat, lon);
  geocodeCache.set(key, { label: fallback, expiresAt: now + GEOCODE_CACHE_MS });
  return fallback;
}
