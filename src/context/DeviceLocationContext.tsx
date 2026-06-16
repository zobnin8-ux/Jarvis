"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  DEFAULT_WEATHER_LAT,
  DEFAULT_WEATHER_LON,
  formatLocationCacheKey,
} from "@/lib/locationDefaults";
import { fetchLocation } from "@/services/locationService";

const CACHE_KEY = "jarvis-device-location-v1";
const CACHE_TTL_MS = 60 * 60 * 1000;

const GEO_OPTIONS: PositionOptions = {
  enableHighAccuracy: false,
  timeout: 15_000,
  maximumAge: 0,
};

export type DeviceLocationSource = "live" | "fallback" | "loading";

export interface DeviceLocation {
  lat: number | null;
  lon: number | null;
  label: string;
  source: DeviceLocationSource;
  cacheKey: string | null;
  ready: boolean;
}

interface CachedCoords {
  lat: number;
  lon: number;
  at: number;
}

const DeviceLocationContext = createContext<DeviceLocation | null>(null);

async function resolvePlaceLabel(lat: number, lon: number): Promise<string> {
  try {
    const response = await fetch(
      `/api/geocode?lat=${encodeURIComponent(String(lat))}&lon=${encodeURIComponent(String(lon))}`
    );
    const json = (await response.json()) as {
      ok?: boolean;
      data?: { label?: string };
    };
    if (json.ok && json.data?.label) {
      return json.data.label.toUpperCase();
    }
  } catch {
    /* fallback below */
  }
  return `${lat.toFixed(2)}°, ${lon.toFixed(2)}°`;
}

function readCachedCoords(): CachedCoords | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedCoords;
    if (
      !Number.isFinite(parsed.lat) ||
      !Number.isFinite(parsed.lon) ||
      Date.now() - parsed.at > CACHE_TTL_MS
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function writeCachedCoords(lat: number, lon: number): void {
  try {
    localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({ lat, lon, at: Date.now() } satisfies CachedCoords)
    );
  } catch {
    /* ignore quota / private mode */
  }
}

function buildLocationState(
  lat: number,
  lon: number,
  label: string,
  source: Exclude<DeviceLocationSource, "loading">
): DeviceLocation {
  return {
    lat,
    lon,
    label,
    source,
    cacheKey: formatLocationCacheKey(lat, lon),
    ready: true,
  };
}

const HOME_STATE = buildLocationState(
  DEFAULT_WEATHER_LAT,
  DEFAULT_WEATHER_LON,
  "SAN JOSE",
  "fallback"
);

export function DeviceLocationProvider({ children }: { children: ReactNode }) {
  const [location, setLocation] = useState<DeviceLocation>(HOME_STATE);

  useEffect(() => {
    let cancelled = false;

    const apply = (next: DeviceLocation) => {
      if (!cancelled) setLocation(next);
    };

    const applyLive = async (lat: number, lon: number) => {
      apply(
        buildLocationState(
          lat,
          lon,
          `${lat.toFixed(2)}°, ${lon.toFixed(2)}°`,
          "live"
        )
      );
      writeCachedCoords(lat, lon);
      const label = await resolvePlaceLabel(lat, lon);
      if (!cancelled) {
        apply(buildLocationState(lat, lon, label, "live"));
      }
    };

    const applyFallback = async () => {
      try {
        const home = await fetchLocation();
        apply(buildLocationState(home.lat, home.lon, home.label, "fallback"));
        return;
      } catch {
        /* env defaults */
      }

      apply(HOME_STATE);
    };

    const cached = readCachedCoords();
    if (cached) {
      void applyLive(cached.lat, cached.lon);
    } else {
      void applyFallback();
    }

    if (typeof navigator === "undefined" || !navigator.geolocation) {
      return () => {
        cancelled = true;
      };
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        void applyLive(position.coords.latitude, position.coords.longitude);
      },
      () => {
        if (!cached) {
          void applyFallback();
        }
      },
      GEO_OPTIONS
    );

    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo(() => location, [location]);

  return (
    <DeviceLocationContext.Provider value={value}>
      {children}
    </DeviceLocationContext.Provider>
  );
}

export function useDeviceLocation(): DeviceLocation {
  const context = useContext(DeviceLocationContext);
  if (!context) {
    throw new Error("useDeviceLocation must be used within DeviceLocationProvider");
  }
  return context;
}
