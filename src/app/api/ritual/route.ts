import { NextResponse } from "next/server";
import {
  BRIEFING_VOICE_RULES,
  dayPartBehaviorRules,
} from "@/lib/briefingContext";
import { resolveDayPart, type DayPart } from "@/lib/daypart";
import { apiSuccess } from "@/lib/server/apiResponse";
import {
  buildBriefingPromptLines,
  gatherBriefingSources,
  type BriefingSourceAvailability,
  type BriefingSources,
} from "@/lib/server/briefingSources";
import { logError } from "@/lib/server/logger";
import { stripMarkdown } from "@/lib/stripMarkdown";
import {
  RITUAL_CLOSING_FALLBACK,
  RITUAL_MOOD_FALLBACK,
} from "@/config/morningRoutine";

type RitualPhase = "mood" | "closing";

async function generateWithClaude(prompt: string, apiKey: string): Promise<string> {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-6",
      max_tokens: 180,
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

function buildMoodPrompt(
  userName: string,
  mood: string,
  dayPart: DayPart,
  sources: BriefingSources,
  availability: BriefingSourceAvailability
): string {
  return [
    `Ты — Jarvis, голосовой ассистент ${userName}. Сейчас ${dayPart}.`,
    "Пользователь ответил на вопрос «Как настроение?».",
    `Его ответ: «${mood}».`,
    "Дай ОДНУ короткую эмпатичную реакцию на русском, 1 предложение.",
    ...BRIEFING_VOICE_RULES,
    "",
    "Контекст дня (не пересказывай панели):",
    ...buildBriefingPromptLines(sources, availability),
  ].join("\n");
}

function buildClosingPrompt(
  userName: string,
  mood: string,
  dayPart: DayPart,
  sources: BriefingSources,
  availability: BriefingSourceAvailability
): string {
  return [
    `Ты — Jarvis, голосовой ассистент ${userName}. Сейчас ${dayPart}.`,
    `Настроение пользователя: «${mood}».`,
    "Дай ОДНУ мотивирующую строку на русском под настроение и день.",
    ...BRIEFING_VOICE_RULES,
    ...dayPartBehaviorRules(dayPart),
    "НЕ пересказывай погоду, встречи и пуск с панелей.",
    "",
    "Контекст:",
    ...buildBriefingPromptLines(sources, availability),
  ].join("\n");
}

export async function POST(request: Request) {
  let body: { phase?: RitualPhase; mood?: string };
  try {
    body = (await request.json()) as { phase?: RitualPhase; mood?: string };
  } catch {
    return NextResponse.json(
      { ok: false, reason: "invalid_body" },
      { status: 400 }
    );
  }

  const phase = body.phase;
  if (phase !== "mood" && phase !== "closing") {
    return NextResponse.json(
      { ok: false, reason: "invalid_phase" },
      { status: 400 }
    );
  }

  const mood = body.mood?.trim() || "нормально";
  const fallback = phase === "mood" ? RITUAL_MOOD_FALLBACK : RITUAL_CLOSING_FALLBACK;
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    return NextResponse.json(apiSuccess({ text: fallback }));
  }

  const userName = process.env.NEXT_PUBLIC_USER_NAME ?? "Andrei";
  const { sources, availability, weatherUtcOffsetSec } =
    await gatherBriefingSources();
  const dayPart = resolveDayPart(new Date(), { utcOffsetSec: weatherUtcOffsetSec });

  const prompt =
    phase === "mood"
      ? buildMoodPrompt(userName, mood, dayPart, sources, availability)
      : buildClosingPrompt(userName, mood, dayPart, sources, availability);

  try {
    const raw = await generateWithClaude(prompt, apiKey);
    return NextResponse.json(apiSuccess({ text: stripMarkdown(raw) }));
  } catch (err) {
    logError("ritual.claude", err);
    return NextResponse.json(apiSuccess({ text: fallback }));
  }
}
