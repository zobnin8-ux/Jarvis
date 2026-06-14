import { NextResponse } from "next/server";
import { apiSuccess, apiUnavailable } from "@/lib/server/apiResponse";
import { resolveWeatherSnapshot } from "@/lib/server/briefingSources";

export async function GET() {
  const result = await resolveWeatherSnapshot();
  if (result.kind === "unavailable") {
    return NextResponse.json(apiUnavailable("openweather"));
  }
  return NextResponse.json(apiSuccess(result.data));
}
