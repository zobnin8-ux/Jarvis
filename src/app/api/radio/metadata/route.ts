import { NextResponse } from "next/server";
import { getStationById } from "@/config/radio";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const stationId = searchParams.get("station");

  if (!stationId) {
    return NextResponse.json({ track: null });
  }

  const station = getStationById(stationId);
  if (!station || station.metadataType === "none") {
    return NextResponse.json({ track: null });
  }

  try {
    if (station.metadataType === "somafm" && station.somaChannel) {
      const res = await fetch(
        `https://api.somafm.com/songs/${station.somaChannel}.json`,
        { next: { revalidate: 30 } }
      );
      if (!res.ok) return NextResponse.json({ track: null });

      const data = await res.json();
      const current = data?.songs?.[0];
      if (!current?.artist) {
        return NextResponse.json({ track: null });
      }

      return NextResponse.json({
        track: current.artist,
        artist: current.artist,
        title: current.title ?? null,
      });
    }

    if (station.metadataType === "radioparadise" && station.rpGenre) {
      const res = await fetch(
        `https://api.radioparadise.com/api/now_playing?genre=${station.rpGenre}`,
        { next: { revalidate: 30 } }
      );
      if (!res.ok) return NextResponse.json({ track: null });

      const data = await res.json();
      const artist = data?.artist;
      const title = data?.title;
      if (!artist || !title) {
        return NextResponse.json({ track: null });
      }

      const coverUrl =
        typeof data?.cover_small === "string"
          ? data.cover_small
          : typeof data?.cover_med === "string"
            ? data.cover_med
            : typeof data?.cover === "string"
              ? data.cover
              : null;

      return NextResponse.json({
        track: `${artist} — ${title}`,
        artist,
        title,
        coverUrl,
      });
    }

    return NextResponse.json({ track: null });
  } catch {
    return NextResponse.json({ track: null });
  }
}
