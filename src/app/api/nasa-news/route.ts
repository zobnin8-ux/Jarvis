import { NextResponse } from "next/server";
import { apiSuccess } from "@/lib/server/apiResponse";
import { fetchNasaNewsHeadline } from "@/lib/server/nasaNews";

export async function GET() {
  const headline = await fetchNasaNewsHeadline();
  return NextResponse.json(apiSuccess(headline));
}
