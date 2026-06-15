import { NextResponse } from "next/server";
import { apiSuccess, apiUnavailable } from "@/lib/server/apiResponse";
import {
  BriefingGenerationError,
  getBriefingSnapshotStrict,
} from "@/lib/server/briefingCache";

export async function GET() {
  try {
    const data = await getBriefingSnapshotStrict();
    return NextResponse.json(apiSuccess(data));
  } catch (err) {
    if (err instanceof BriefingGenerationError) {
      return NextResponse.json(apiUnavailable("claude"));
    }
    throw err;
  }
}

