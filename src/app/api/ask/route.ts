import { NextResponse } from "next/server";
import type { AskResponseData, VoiceAction } from "@/types/modules";
import { apiSuccess, apiUnavailable } from "@/lib/server/apiResponse";
import {
  buildFallbackBriefingText,
  getBriefingSnapshot,
} from "@/lib/server/briefingCache";
import {
  buildAskContextLines,
  buildAskSystemPrompt,
  gatherBriefingSources,
} from "@/lib/server/briefingSources";
import { resolveGmailSnapshot } from "@/lib/server/gmail";
import { fetchIssTelemetrySnapshot } from "@/lib/server/issTelemetrySnapshot";
import { logError } from "@/lib/server/logger";
import { fetchWorldNewsSnapshot } from "@/lib/server/worldNews";
import { resolveDayPart } from "@/lib/daypart";
import { stripMarkdown } from "@/lib/stripMarkdown";
import {
  detectRadioVoiceAction,
  isVoiceShortCommand,
} from "@/lib/voiceCommands";

async function askClaude(
  systemPrompt: string,
  query: string,
  apiKey: string,
  maxTokens: number
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
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [{ role: "user", content: query }],
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

function buildDemoAnswer(query: string, userName: string): string {
  return `${userName}, я в demo-режиме. Вы спросили: «${query.slice(0, 120)}». Подключите ANTHROPIC_API_KEY для полноценных ответов.`;
}

export async function POST(request: Request) {
  let body: { query?: string };
  try {
    body = (await request.json()) as { query?: string };
  } catch {
    return NextResponse.json(
      apiUnavailable("claude"),
      { status: 400 }
    );
  }

  const query = body.query?.trim();
  if (!query) {
    return NextResponse.json(
      { ok: false, reason: "unavailable", service: "claude" as const },
      { status: 400 }
    );
  }

  const userName = process.env.NEXT_PUBLIC_USER_NAME ?? "Andrei";
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    const data: AskResponseData = {
      text: buildDemoAnswer(query, userName),
    };
    return NextResponse.json(apiSuccess(data));
  }

  const bundle = await gatherBriefingSources();
  const { sources, availability, weatherUtcOffsetSec } = bundle;
  const dayPart = resolveDayPart(new Date(), {
    utcOffsetSec: weatherUtcOffsetSec,
  });

  const [briefingResult, iss, worldNewsResult, gmailResult] = await Promise.all([
    getBriefingSnapshot(bundle).catch(() => null),
    fetchIssTelemetrySnapshot(),
    fetchWorldNewsSnapshot(),
    resolveGmailSnapshot(),
  ]);

  const briefingText =
    briefingResult?.text ?? buildFallbackBriefingText(bundle);

  const worldNewsAvailable = worldNewsResult.kind !== "unavailable";
  const worldNews = worldNewsAvailable ? worldNewsResult.data : null;
  const gmailAvailable = gmailResult.kind === "live";
  const gmail = gmailAvailable ? gmailResult.data : null;

  const contextLines = buildAskContextLines(sources, availability, {
    briefingText,
    iss,
    worldNews,
    worldNewsAvailable,
    gmail,
    gmailAvailable,
  });
  const systemPrompt = buildAskSystemPrompt(userName, dayPart, contextLines);
  const shortCommand = isVoiceShortCommand(query);

  try {
    const raw = await askClaude(
      systemPrompt,
      query,
      apiKey,
      shortCommand ? 128 : 512
    );
    const text = stripMarkdown(raw);

    const actions: VoiceAction[] = [];
    const radioAction = detectRadioVoiceAction(query);
    if (radioAction) {
      actions.push({ type: "radio", command: radioAction });
    }

    const data: AskResponseData = actions.length > 0 ? { text, actions } : { text };
    return NextResponse.json(apiSuccess(data));
  } catch (err) {
    logError("ask.claude", err);
    return NextResponse.json(apiUnavailable("claude"));
  }
}
