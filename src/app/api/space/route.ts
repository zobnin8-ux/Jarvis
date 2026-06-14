import { NextResponse } from "next/server";
import { apiSuccess, apiUnavailable } from "@/lib/server/apiResponse";
import {
  attachIssPassOptional,
  fetchLiveSpaceLaunch,
} from "@/lib/server/spaceSnapshot";

export async function GET() {
  try {
    const launch = await attachIssPassOptional(await fetchLiveSpaceLaunch());
    return NextResponse.json(apiSuccess(launch));
  } catch {
    return NextResponse.json(apiUnavailable("spacedevs"));
  }
}
