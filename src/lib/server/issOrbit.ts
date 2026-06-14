import * as satellite from "satellite.js";
import { logError, logWarn } from "@/lib/server/logger";

const TLE_URL =
  "https://celestrak.org/NORAD/elements/gp.php?CATNR=25544&FORMAT=json";
const TLE_CACHE_MS = 60 * 60 * 1000;

let tleCache: { satrec: satellite.SatRec; expiresAt: number } | null = null;

async function fetchIssSatrec(): Promise<satellite.SatRec | null> {
  const now = Date.now();
  if (tleCache && tleCache.expiresAt > now) {
    return tleCache.satrec;
  }

  try {
    const response = await fetch(TLE_URL, {
      headers: { "User-Agent": "Jarvis-Command-Center/1.0" },
      next: { revalidate: 3600 },
    });
    if (!response.ok) {
      logWarn("iss-orbit.tle", `HTTP ${response.status}`);
      return tleCache?.satrec ?? null;
    }

    const rows = (await response.json()) as Array<{
      OBJECT_NAME?: string;
      TLE_LINE1?: string;
      TLE_LINE2?: string;
    }>;
    const row = rows[0];
    if (!row?.TLE_LINE1 || !row?.TLE_LINE2) {
      return tleCache?.satrec ?? null;
    }

    const satrec = satellite.twoline2satrec(
      row.TLE_LINE1.trim(),
      row.TLE_LINE2.trim()
    );
    tleCache = { satrec, expiresAt: now + TLE_CACHE_MS };
    return satrec;
  } catch (err) {
    logError("iss-orbit.tle", err);
    return tleCache?.satrec ?? null;
  }
}

export interface OrbitStats {
  orbitNumberToday: number;
  orbitProgressPct: number;
  periodMin: number;
}

export async function computeIssOrbitStats(
  date = new Date()
): Promise<OrbitStats | null> {
  const satrec = await fetchIssSatrec();
  if (!satrec) return null;

  const periodSec = (2 * Math.PI / satrec.no) * 60;
  const periodMin = periodSec / 60;
  const epochMs = (satrec.jdsatepoch - 2440587.5) * 86_400_000;
  const msSinceEpoch = date.getTime() - epochMs;
  const phase = ((msSinceEpoch / 1000) % periodSec) / periodSec;
  const orbitProgressPct = Math.round(phase * 100);

  const midnight = Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate()
  );
  const msSinceMidnight = date.getTime() - midnight;
  const orbitNumberToday =
    Math.floor(msSinceMidnight / 1000 / periodSec) + 1;

  return { orbitNumberToday, orbitProgressPct, periodMin };
}
