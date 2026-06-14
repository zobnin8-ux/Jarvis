import { NextResponse } from "next/server";
import { apiSuccess } from "@/lib/server/apiResponse";
import { fetchIssTelemetrySnapshot } from "@/lib/server/issTelemetrySnapshot";

export const dynamic = "force-dynamic";

export async function GET() {
  const data = await fetchIssTelemetrySnapshot();
  return NextResponse.json(apiSuccess(data));
}
