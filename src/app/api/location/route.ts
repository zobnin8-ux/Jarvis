import { NextResponse } from "next/server";
import { apiSuccess } from "@/lib/server/apiResponse";
import { resolveLocationCoords } from "@/lib/locationDefaults";

export async function GET() {
  return NextResponse.json(apiSuccess(resolveLocationCoords()));
}
