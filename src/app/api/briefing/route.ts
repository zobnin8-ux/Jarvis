import { NextResponse } from "next/server";
import type { BriefingData } from "@/types/modules";
import { apiSuccess, apiUnavailable } from "@/lib/server/apiResponse";
import {
  buildDemoBriefing,
  gatherBriefingSources,
} from "@/lib/server/briefingSources";

const CACHE_TTL_MS = 3 * 60 * 60 * 1000;

let cache: { data: BriefingData; expiresAt: number } | null = null;

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
      max_tokens: 256,
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
  if (cache && cache.expiresAt > now) {
    return NextResponse.json(apiSuccess(cache.data));
  }

  const userName = process.env.NEXT_PUBLIC_USER_NAME ?? "Andrei";
  const sourcesResult = await gatherBriefingSources();

  if (!sourcesResult.ok) {
    return NextResponse.json(apiUnavailable(sourcesResult.service));
  }

  const { weather, calendar, space } = sourcesResult.sources;
  const generatedAt = new Date().toISOString();
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    const data: BriefingData = {
      text: buildDemoBriefing(weather, calendar, space, userName),
      generatedAt,
    };
    cache = { data, expiresAt: now + CACHE_TTL_MS };
    return NextResponse.json(apiSuccess(data));
  }

  try {
    const prompt = [
      `You are Jarvis, a concise personal assistant.`,
      `Write a morning briefing in 2-3 sentences for ${userName}.`,
      `Tone: calm, direct, no fluff.`,
      ``,
      `Weather: ${weather.temperature}°C, ${weather.description}, status ${weather.icon}, precip ${weather.precipChance}%.`,
      `Calendar next: ${calendar.nextEvent ? `${calendar.nextEvent.time} ${calendar.nextEvent.title}` : "none"}.`,
      `Space: ${space.operator} ${space.mission}, phase ${space.phase}, countdown ${space.countdown}.`,
    ].join("\n");

    const text = await generateWithClaude(prompt, apiKey);
    const data: BriefingData = { text, generatedAt };
    cache = { data, expiresAt: now + CACHE_TTL_MS };
    return NextResponse.json(apiSuccess(data));
  } catch {
    return NextResponse.json(apiUnavailable("claude"));
  }
}
