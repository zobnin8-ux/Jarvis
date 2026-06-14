import { NextResponse } from "next/server";
import { apiSuccess, apiUnavailable } from "@/lib/server/apiResponse";
import { resolveSvEvents } from "@/lib/server/svEvents";
import { logWarn } from "@/lib/server/logger";

export async function GET() {
  const result = await resolveSvEvents();
  if (result.kind === "unavailable") {
    logWarn("api.sv-events", "Finnhub quotes unavailable");
    return NextResponse.json(apiUnavailable("sv-events"));
  }
  return NextResponse.json(apiSuccess(result.data));
}
