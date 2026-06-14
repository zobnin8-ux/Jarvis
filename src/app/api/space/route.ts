import { NextResponse } from "next/server";
import { apiSuccess, apiUnavailable } from "@/lib/server/apiResponse";
import { fetchCachedSpaceLaunch } from "@/lib/server/spaceSnapshot";
import { logError } from "@/lib/server/logger";

export async function GET() {
  try {
    const launch = await fetchCachedSpaceLaunch();
    return NextResponse.json(apiSuccess(launch));
  } catch (err) {
    logError("api.space", err);
    return NextResponse.json(apiUnavailable("spacedevs"));
  }
}
