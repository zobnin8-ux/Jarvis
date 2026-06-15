import { NextResponse } from "next/server";
import { apiSuccess, apiUnavailable } from "@/lib/server/apiResponse";
import { resolveGmailSnapshot } from "@/lib/server/gmail";

export async function GET() {
  const result = await resolveGmailSnapshot();

  if (result.kind === "unavailable") {
    return NextResponse.json(apiUnavailable("gmail"));
  }

  return NextResponse.json(apiSuccess(result.data));
}
