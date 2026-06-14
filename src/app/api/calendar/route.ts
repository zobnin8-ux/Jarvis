import { NextResponse } from "next/server";
import { apiSuccess, apiUnavailable } from "@/lib/server/apiResponse";
import { resolveCalendarSnapshot } from "@/lib/server/briefingSources";

export async function GET() {
  const result = await resolveCalendarSnapshot();
  if (result.kind === "unavailable") {
    return NextResponse.json(apiUnavailable("google-calendar"));
  }
  return NextResponse.json(apiSuccess(result.data));
}
