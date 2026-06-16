import { NextRequest, NextResponse } from "next/server";
import { resolveLocationCoords } from "@/lib/locationDefaults";
import { apiSuccess, apiUnavailable } from "@/lib/server/apiResponse";
import { resolveWeatherSnapshot } from "@/lib/server/briefingSources";

function parseCoords(request: NextRequest): { lat: number; lon: number } | undefined {
  const lat = Number.parseFloat(request.nextUrl.searchParams.get("lat") ?? "");
  const lon = Number.parseFloat(request.nextUrl.searchParams.get("lon") ?? "");
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return undefined;
  return { lat, lon };
}

export async function GET(request: NextRequest) {
  const coords = parseCoords(request) ?? resolveLocationCoords();
  const result = await resolveWeatherSnapshot(coords);
  if (result.kind === "unavailable") {
    return NextResponse.json(apiUnavailable("openweather"));
  }
  return NextResponse.json(apiSuccess(result.data));
}
