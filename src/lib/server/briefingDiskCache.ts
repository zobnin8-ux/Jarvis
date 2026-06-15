import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import type { DayPart } from "@/lib/daypart";
import { logWarn } from "@/lib/server/logger";
import type { BriefingData } from "@/types/modules";

export interface BriefingCacheEntry {
  data: BriefingData;
  expiresAt: number;
  dayPart: DayPart;
}

const CACHE_DIR = path.join(process.cwd(), ".data");
const CACHE_FILE = path.join(CACHE_DIR, "briefing-cache.json");

export async function readBriefingDiskCache(
  now: number,
  dayPart: DayPart
): Promise<BriefingCacheEntry | null> {
  try {
    const raw = await readFile(CACHE_FILE, "utf8");
    const entry = JSON.parse(raw) as BriefingCacheEntry;
    if (
      typeof entry?.data?.text === "string" &&
      typeof entry.expiresAt === "number" &&
      entry.expiresAt > now &&
      entry.dayPart === dayPart
    ) {
      return entry;
    }
  } catch {
    /* missing or corrupt — regenerate */
  }
  return null;
}

export async function writeBriefingDiskCache(
  entry: BriefingCacheEntry
): Promise<void> {
  try {
    await mkdir(CACHE_DIR, { recursive: true });
    await writeFile(CACHE_FILE, JSON.stringify(entry), "utf8");
  } catch (err) {
    logWarn("briefing.disk-cache", String(err));
  }
}
