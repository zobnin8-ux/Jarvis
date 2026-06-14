import { NextResponse } from "next/server";
import { fetchAudiobooksSnapshot } from "@/lib/server/audiobooks";
import { apiSuccess, apiUnavailable } from "@/lib/server/apiResponse";

export async function GET() {
  const result = await fetchAudiobooksSnapshot();
  if (result.kind === "unavailable") {
    return NextResponse.json(apiUnavailable("youtube"));
  }
  return NextResponse.json(apiSuccess(result.data));
}
