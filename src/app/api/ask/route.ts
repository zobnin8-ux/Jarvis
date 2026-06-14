import { NextResponse } from "next/server";
import type { AskResponseData } from "@/types/modules";
import { apiSuccess, apiUnavailable } from "@/lib/server/apiResponse";
import {
  buildAskContextLines,
  gatherBriefingSources,
} from "@/lib/server/briefingSources";
import { logError } from "@/lib/server/logger";

async function askClaude(
  systemPrompt: string,
  query: string,
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
      max_tokens: 512,
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

  const { sources, availability } = await gatherBriefingSources();
  const context = buildAskContextLines(sources, availability).join(" ");

  const systemPrompt = [
    `Ты — Jarvis, лаконичный личный ассистент ${userName}.`,
    "Отвечай коротко, по делу, на русском.",
    context,
  ].join("\n");

  try {
    const text = await askClaude(systemPrompt, query, apiKey);
    return NextResponse.json(apiSuccess({ text }));
  } catch (err) {
    logError("ask.claude", err);
    return NextResponse.json(apiUnavailable("claude"));
  }
}
