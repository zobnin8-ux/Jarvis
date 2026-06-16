import { NextRequest, NextResponse } from "next/server";
import { apiSuccess } from "@/lib/server/apiResponse";
import { reverseGeocodeDevice } from "@/lib/server/deviceGeocode";

export async function GET(request: NextRequest) {
  const lat = Number.parseFloat(request.nextUrl.searchParams.get("lat") ?? "");
  const lon = Number.parseFloat(request.nextUrl.searchParams.get("lon") ?? "");

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return NextResponse.json(
      { ok: false, reason: "invalid", message: "lat and lon required" },
      { status: 400 }
    );
  }

  const label = await reverseGeocodeDevice(lat, lon);
  return NextResponse.json(apiSuccess({ label }));
}
