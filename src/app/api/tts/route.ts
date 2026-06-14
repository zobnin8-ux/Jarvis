import { NextResponse } from "next/server";
import { apiUnavailable } from "@/lib/server/apiResponse";
import { logError, logWarn } from "@/lib/server/logger";

const ELEVEN_STABILITY = 0.45;
const ELEVEN_SIMILARITY = 0.78;

export async function POST(request: Request) {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  const voiceId = process.env.ELEVENLABS_VOICE_ID;

  if (!apiKey || !voiceId) {
    return NextResponse.json(apiUnavailable("elevenlabs"));
  }

  let body: { text?: string };
  try {
    body = (await request.json()) as { text?: string };
  } catch (err) {
    logError("tts.request", err);
    return NextResponse.json(apiUnavailable("elevenlabs"), { status: 400 });
  }

  const text = body.text?.trim();
  if (!text) {
    return NextResponse.json(apiUnavailable("elevenlabs"), { status: 400 });
  }

  try {
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        method: "POST",
        headers: {
          "xi-api-key": apiKey,
          "content-type": "application/json",
          accept: "audio/mpeg",
        },
        body: JSON.stringify({
          text,
          model_id: "eleven_multilingual_v2",
          voice_settings: {
            stability: ELEVEN_STABILITY,
            similarity_boost: ELEVEN_SIMILARITY,
          },
        }),
      }
    );

    if (!response.ok) {
      logWarn("tts.elevenlabs", `HTTP ${response.status}`);
      return NextResponse.json(apiUnavailable("elevenlabs"));
    }

    const audioBuffer = await response.arrayBuffer();
    return new NextResponse(audioBuffer, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    logError("tts.elevenlabs", err);
    return NextResponse.json(apiUnavailable("elevenlabs"));
  }
}
