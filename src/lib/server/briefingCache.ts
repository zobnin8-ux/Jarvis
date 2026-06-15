import type { BriefingData } from "@/types/modules";
import { resolveDayPart } from "@/lib/daypart";
import { stripMarkdown } from "@/lib/stripMarkdown";
import { logError } from "@/lib/server/logger";
import {
  buildClaudeBriefingPrompt,
  buildDemoBriefing,
  gatherBriefingSources,
  type BriefingSourcesBundle,
} from "@/lib/server/briefingSources";

import {
  readBriefingDiskCache,
  writeBriefingDiskCache,
  type BriefingCacheEntry,
} from "@/lib/server/briefingDiskCache";

const CACHE_TTL_MS = 3 * 60 * 60 * 1000;

let cache: BriefingCacheEntry | null = null;

function storeCache(entry: BriefingCacheEntry) {
  cache = entry;
  void writeBriefingDiskCache(entry);
}

async function generateWithClaude(
  prompt: string,
  apiKey: string
): Promise<string> {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-6",
      max_tokens: 320,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!response.ok) {
    throw new Error(`Claude API error: ${response.status}`);
  }

  const json = (await response.json()) as {
    content?: { type: string; text?: string }[];
  };

  const text = json.content?.find((block) => block.type === "text")?.text?.trim();
  if (!text) throw new Error("Empty Claude response");
  return text;
}

/** Shared briefing cache for `/api/briefing` and voice `/api/ask`. */
export async function getBriefingSnapshot(
  existing?: BriefingSourcesBundle
): Promise<BriefingData> {
  const bundle = existing ?? (await gatherBriefingSources());
  const { sources, availability, weatherUtcOffsetSec } = bundle;
  const dayPart = resolveDayPart(new Date(), {
    utcOffsetSec: weatherUtcOffsetSec,
  });
  const now = Date.now();

  if (cache && cache.expiresAt > now && cache.dayPart === dayPart) {
    return cache.data;
  }

  const diskEntry = await readBriefingDiskCache(now, dayPart);
  if (diskEntry) {
    cache = diskEntry;
    return diskEntry.data;
  }

  const userName = process.env.NEXT_PUBLIC_USER_NAME ?? "Andrei";
  const generatedAt = new Date().toISOString();
  const { weather, calendar, space } = sources;
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    const data: BriefingData = {
      text: buildDemoBriefing(
        weather,
        calendar,
        space,
        userName,
        availability,
        dayPart
      ),
      generatedAt,
    };
    const entry: BriefingCacheEntry = {
      data,
      expiresAt: now + CACHE_TTL_MS,
      dayPart,
    };
    storeCache(entry);
    return data;
  }

  const prompt = buildClaudeBriefingPrompt(
    userName,
    dayPart,
    sources,
    availability
  );
  const raw = await generateWithClaude(prompt, apiKey);
  const data: BriefingData = {
    text: stripMarkdown(raw),
    generatedAt,
  };
  storeCache({ data, expiresAt: now + CACHE_TTL_MS, dayPart });
  return data;
}

/** Demo briefing when Claude is down — voice still gets panel-aligned context. */
export function buildFallbackBriefingText(
  bundle: BriefingSourcesBundle
): string {
  const { sources, availability, weatherUtcOffsetSec } = bundle;
  const dayPart = resolveDayPart(new Date(), {
    utcOffsetSec: weatherUtcOffsetSec,
  });
  const userName = process.env.NEXT_PUBLIC_USER_NAME ?? "Andrei";
  const { weather, calendar, space } = sources;
  return buildDemoBriefing(
    weather,
    calendar,
    space,
    userName,
    availability,
    dayPart
  );
}

export class BriefingGenerationError extends Error {
  constructor(cause?: unknown) {
    super("Briefing generation failed");
    this.name = "BriefingGenerationError";
    if (cause instanceof Error) this.cause = cause;
  }
}

export async function getBriefingSnapshotStrict(
  existing?: BriefingSourcesBundle
): Promise<BriefingData> {
  try {
    return await getBriefingSnapshot(existing);
  } catch (err) {
    logError("briefing.claude", err);
    throw new BriefingGenerationError(err);
  }
}
