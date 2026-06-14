import { NextResponse } from "next/server";
import { apiSuccess, apiUnavailable } from "@/lib/server/apiResponse";
import { resolveSvEvents } from "@/lib/server/svEvents";

export async function GET() {
  const result = await resolveSvEvents();
  if (result.kind === "unavailable") {
    return NextResponse.json(apiUnavailable("sv-events"));
  }
  return NextResponse.json(apiSuccess(result.data));
}
