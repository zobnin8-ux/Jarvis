"use client";

import { useCallback, useContext, useEffect, useRef, useState } from "react";
import {
  ModuleHealthContext,
  type ModuleHealthId,
} from "@/context/ModuleHealthContext";
import { isServiceUnavailableError } from "@/lib/client/apiFetch";

const RETRY_DELAYS_MS = [2000, 8000, 30000];

interface CachedPayload<T> {
  data: T;
  lastUpdated: number;
}

interface UseIntervalFetchOptions<T> {
  fetcher: () => Promise<T>;
  interval: number;
  cacheKey?: string;
  healthId?: ModuleHealthId;
}

interface UseIntervalFetchResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  isStale: boolean;
  lastUpdated: number | null;
  unavailableService: string | null;
}

function isApiEnvelope(
  value: unknown
): value is { ok: true; data: unknown } {
  return (
    typeof value === "object" &&
    value !== null &&
    "ok" in value &&
    (value as { ok: unknown }).ok === true &&
    "data" in value
  );
}

/** Unwrap legacy cache entries that stored full `{ ok, data }` API responses. */
function normalizeCachedPayload<T>(
  parsed: CachedPayload<unknown>
): CachedPayload<T> | null {
  let inner = parsed.data;
  if (isApiEnvelope(inner)) {
    inner = inner.data;
  }
  if (inner == null || typeof inner !== "object") return null;
  return { data: inner as T, lastUpdated: parsed.lastUpdated };
}

function readCache<T>(cacheKey: string): CachedPayload<T> | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(cacheKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedPayload<unknown>;
    return normalizeCachedPayload<T>(parsed);
  } catch {
    return null;
  }
}

function writeCache<T>(cacheKey: string, data: T, lastUpdated: number): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(
      cacheKey,
      JSON.stringify({ data, lastUpdated } satisfies CachedPayload<T>)
    );
  } catch {
    // ignore quota errors
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function useIntervalFetch<T>({
  fetcher,
  interval,
  cacheKey,
  healthId,
}: UseIntervalFetchOptions<T>): UseIntervalFetchResult<T> {
  const reportHealth = useContext(ModuleHealthContext)?.reportHealth;
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const [data, setData] = useState<T | null>(() => {
    if (!cacheKey) return null;
    return readCache<T>(cacheKey)?.data ?? null;
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isStale, setIsStale] = useState(false);
  const [unavailableService, setUnavailableService] = useState<string | null>(
    null
  );
  const [lastUpdated, setLastUpdated] = useState<number | null>(() => {
    if (!cacheKey) return null;
    return readCache<T>(cacheKey)?.lastUpdated ?? null;
  });

  const dataRef = useRef(data);
  dataRef.current = data;
  const inFlightRef = useRef(false);

  const publishHealth = useCallback(
    (
      state: "online" | "stale" | "offline",
      updated: number | null,
      message: string | null
    ) => {
      if (!healthId || !reportHealth) return;
      reportHealth(healthId, {
        state,
        lastUpdated: updated,
        error: message,
      });
    },
    [healthId, reportHealth]
  );

  const load = useCallback(async () => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;

    let lastError: string | null = null;

    for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
      try {
        const result = await fetcherRef.current();
        const now = Date.now();
        setData(result);
        setError(null);
        setIsStale(false);
        setUnavailableService(null);
        setLastUpdated(now);
        if (cacheKey) writeCache(cacheKey, result, now);
        publishHealth("online", now, null);
        setLoading(false);
        inFlightRef.current = false;
        return;
      } catch (err) {
        if (isServiceUnavailableError(err)) {
          const hasCachedData = dataRef.current !== null;
          setUnavailableService(err.service);
          setError(null);
          setIsStale(hasCachedData);
          publishHealth(
            hasCachedData ? "stale" : "offline",
            lastUpdated,
            null
          );
          setLoading(false);
          inFlightRef.current = false;
          return;
        }

        lastError =
          err instanceof Error ? err.message : "Failed to load data";
        if (attempt < RETRY_DELAYS_MS.length) {
          await sleep(RETRY_DELAYS_MS[attempt]);
        }
      }
    }

    const hasCachedData = dataRef.current !== null;
    setError(lastError);
    setIsStale(hasCachedData);
    setUnavailableService(null);
    publishHealth(
      hasCachedData ? "stale" : "offline",
      lastUpdated,
      lastError
    );
    setLoading(false);
    inFlightRef.current = false;
  }, [cacheKey, lastUpdated, publishHealth]);

  useEffect(() => {
    void load();
    const timer = setInterval(load, interval);
    return () => clearInterval(timer);
  }, [load, interval]);

  return {
    data,
    loading,
    error,
    isStale,
    lastUpdated,
    unavailableService,
  };
}
