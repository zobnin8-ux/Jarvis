import { NextResponse } from "next/server";
import { apiSuccess, apiUnavailable } from "@/lib/server/apiResponse";
import { fetchWorldNewsSnapshot } from "@/lib/server/worldNews";

export async function GET() {
  const result = await fetchWorldNewsSnapshot();

  if (result.kind === "unavailable") {
    return NextResponse.json(apiUnavailable("world-news"));
  }

  return NextResponse.json(apiSuccess(result.data));
}
