import type { IssTelemetryData } from "@/types/modules";
import { reverseGeocodeIss } from "@/lib/server/issGeocode";
import { computeIssOrbitStats } from "@/lib/server/issOrbit";
import { logError, logWarn } from "@/lib/server/logger";

const WTIA_URL = "https://api.wheretheiss.at/v1/satellites/25544";
const CACHE_TTL_MS = 15_000;
const MAX_VELOCITY_KMS = 7.8;

let cache: { data: IssTelemetryData; expiresAt: number } | null = null;

interface WtiaPayload {
  latitude: number;
  longitude: number;
  altitude: number;
  velocity: number;
  visibility: string;
  timestamp: number;
}

async function fetchWtia(): Promise<WtiaPayload | null> {
  try {
    const response = await fetch(WTIA_URL, {
      headers: { "User-Agent": "Jarvis-Command-Center/1.0" },
      next: { revalidate: 15 },
    });
    if (!response.ok) {
      logWarn("iss-telemetry.wtia", `HTTP ${response.status}`);
      return null;
    }
    return (await response.json()) as WtiaPayload;
  } catch (err) {
    logError("iss-telemetry.wtia", err);
    return null;
  }
}

export async function fetchIssTelemetrySnapshot(): Promise<IssTelemetryData | null> {
  const now = Date.now();
  if (cache && cache.expiresAt > now) {
    return cache.data;
  }

  const wtia = await fetchWtia();
  if (!wtia) return cache?.data ?? null;

  const [locationLabel, orbitStats] = await Promise.all([
    reverseGeocodeIss(wtia.latitude, wtia.longitude),
    computeIssOrbitStats(new Date(wtia.timestamp * 1000)),
  ]);

  const visibility =
    wtia.visibility === "eclipsed" ? "eclipsed" : "daylight";

  const data: IssTelemetryData = {
    noradId: 25544,
    locationLabel,
    latitude: wtia.latitude,
    longitude: wtia.longitude,
    altitudeKm: wtia.altitude,
    velocityKms: wtia.velocity,
    maxVelocityKms: MAX_VELOCITY_KMS,
    visibility,
    orbitNumberToday: orbitStats?.orbitNumberToday,
    orbitProgressPct: orbitStats?.orbitProgressPct,
    updatedAt: new Date(wtia.timestamp * 1000).toISOString(),
  };

  cache = { data, expiresAt: now + CACHE_TTL_MS };
  return data;
}
