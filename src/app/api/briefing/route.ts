import { NextResponse } from "next/server";
import type { BriefingData } from "@/types/modules";
import { apiSuccess, apiUnavailable } from "@/lib/server/apiResponse";
import {
  buildClaudeBriefingPrompt,
  buildDemoBriefing,
  gatherBriefingSources,
} from "@/lib/server/briefingSources";
import { logError } from "@/lib/server/logger";
import { resolveDayPart, type DayPart } from "@/lib/daypart";

const CACHE_TTL_MS = 3 * 60 * 60 * 1000;

let cache: { data: BriefingData; expiresAt: number; dayPart: DayPart } | null =
  null;

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

export async function GET() {
  const now = Date.now();
  const { sources, availability, weatherUtcOffsetSec } =
    await gatherBriefingSources();
  const dayPart = resolveDayPart(new Date(), { utcOffsetSec: weatherUtcOffsetSec });

  if (cache && cache.expiresAt > now && cache.dayPart === dayPart) {
    return NextResponse.json(apiSuccess(cache.data));
  }

  const userName = process.env.NEXT_PUBLIC_USER_NAME ?? "Andrei";
  const { weather, calendar, space } = sources;
  const generatedAt = new Date().toISOString();
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
    cache = { data, expiresAt: now + CACHE_TTL_MS, dayPart };
    return NextResponse.json(apiSuccess(data));
  }

  try {
    const prompt = buildClaudeBriefingPrompt(
      userName,
      dayPart,
      sources,
      availability
    );

    const text = await generateWithClaude(prompt, apiKey);
    const data: BriefingData = { text, generatedAt };
    cache = { data, expiresAt: now + CACHE_TTL_MS, dayPart };
    return NextResponse.json(apiSuccess(data));
  } catch (err) {
    logError("briefing.claude", err);
    return NextResponse.json(apiUnavailable("claude"));
  }
}
