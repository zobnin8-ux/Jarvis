import { logError } from "@/lib/server/logger";
import type { AudiobookData, AudiobookItem } from "@/types/modules";

const CACHE_TTL_MS = 45 * 60 * 1000;
const DEFAULT_CHANNEL_ID = "UCY-ekT04DX2bQhzYvm2y5Lw";
const MAX_RESULTS = 24;

let cache: { data: AudiobookData; expiresAt: number } | null = null;

interface YouTubePlaylistItemSnippet {
  title: string;
  publishedAt: string;
  thumbnails?: {
    medium?: { url?: string };
    high?: { url?: string };
    default?: { url?: string };
  };
}

interface YouTubePlaylistItem {
  snippet?: YouTubePlaylistItemSnippet;
  contentDetails?: { videoId?: string };
}

interface YouTubePlaylistItemsResponse {
  items?: YouTubePlaylistItem[];
}

interface YouTubeVideoContentDetails {
  duration?: string;
}

interface YouTubeVideoItem {
  id?: string;
  contentDetails?: YouTubeVideoContentDetails;
}

interface YouTubeVideosResponse {
  items?: YouTubeVideoItem[];
}

function channelToUploadsPlaylistId(channelId: string): string {
  if (channelId.startsWith("UC")) {
    return `UU${channelId.slice(2)}`;
  }
  return channelId;
}

export function parseIso8601Duration(iso: string): number {
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  const hours = Number.parseInt(match[1] ?? "0", 10);
  const minutes = Number.parseInt(match[2] ?? "0", 10);
  const seconds = Number.parseInt(match[3] ?? "0", 10);
  return hours * 3600 + minutes * 60 + seconds;
}

function demoAudiobooks(): AudiobookData {
  const now = new Date().toISOString();
  return {
    channelTitle: "Голос Коваленко — аудиокниги (demo)",
    items: [
      {
        videoId: "demo-audio-1",
        title: "Аудиокнига — демо выпуск 1",
        thumbnailUrl: "https://i.ytimg.com/vi/placeholder/hqdefault.jpg",
        publishedAt: now,
        durationSec: 3600,
      },
      {
        videoId: "demo-audio-2",
        title: "Аудиокнига — демо выпуск 2",
        thumbnailUrl: "https://i.ytimg.com/vi/placeholder/hqdefault.jpg",
        publishedAt: now,
        durationSec: 5400,
      },
      {
        videoId: "demo-audio-3",
        title: "Аудиокнига — демо выпуск 3",
        thumbnailUrl: "https://i.ytimg.com/vi/placeholder/hqdefault.jpg",
        publishedAt: now,
        durationSec: 7200,
      },
    ],
  };
}

function pickThumbnail(snippet: YouTubePlaylistItemSnippet): string {
  return (
    snippet.thumbnails?.medium?.url ??
    snippet.thumbnails?.high?.url ??
    snippet.thumbnails?.default?.url ??
    ""
  );
}

async function fetchPlaylistItems(
  playlistId: string,
  apiKey: string
): Promise<YouTubePlaylistItem[]> {
  const url = new URL("https://www.googleapis.com/youtube/v3/playlistItems");
  url.searchParams.set("part", "snippet,contentDetails");
  url.searchParams.set("playlistId", playlistId);
  url.searchParams.set("maxResults", String(MAX_RESULTS));
  url.searchParams.set("key", apiKey);

  const res = await fetch(url.toString(), { next: { revalidate: 0 } });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    logError("audiobooks.playlistItems", new Error(`HTTP ${res.status}: ${body.slice(0, 200)}`));
    throw new Error(`YouTube playlistItems ${res.status}`);
  }

  const json = (await res.json()) as YouTubePlaylistItemsResponse;
  return json.items ?? [];
}

async function fetchVideoDurations(
  videoIds: string[],
  apiKey: string
): Promise<Map<string, number>> {
  if (videoIds.length === 0) return new Map();

  const url = new URL("https://www.googleapis.com/youtube/v3/videos");
  url.searchParams.set("part", "contentDetails");
  url.searchParams.set("id", videoIds.join(","));
  url.searchParams.set("key", apiKey);

  const res = await fetch(url.toString(), { next: { revalidate: 0 } });
  if (!res.ok) {
    logError("audiobooks.videos", new Error(`HTTP ${res.status}`));
    return new Map();
  }

  const json = (await res.json()) as YouTubeVideosResponse;
  const map = new Map<string, number>();
  for (const item of json.items ?? []) {
    if (!item.id || !item.contentDetails?.duration) continue;
    map.set(item.id, parseIso8601Duration(item.contentDetails.duration));
  }
  return map;
}

function normalizeItems(
  raw: YouTubePlaylistItem[],
  durations: Map<string, number>
): AudiobookItem[] {
  const items: AudiobookItem[] = [];

  for (const entry of raw) {
    const id = entry.contentDetails?.videoId;
    const snippet = entry.snippet;
    if (!id || !snippet?.title) continue;

    const durationSec = durations.get(id);
    items.push({
      videoId: id,
      title: snippet.title,
      thumbnailUrl: pickThumbnail(snippet),
      publishedAt: snippet.publishedAt ?? new Date().toISOString(),
      ...(durationSec != null && durationSec > 0 ? { durationSec } : {}),
    });
  }

  return items;
}

export async function fetchAudiobooksSnapshot(): Promise<
  | { kind: "ok"; data: AudiobookData }
  | { kind: "demo"; data: AudiobookData }
  | { kind: "unavailable" }
> {
  const now = Date.now();
  if (cache && cache.expiresAt > now) {
    return { kind: "ok", data: cache.data };
  }

  const apiKey = process.env.YOUTUBE_API_KEY?.trim();
  if (!apiKey) {
    return { kind: "demo", data: demoAudiobooks() };
  }

  const channelId =
    process.env.YOUTUBE_CHANNEL_ID?.trim() || DEFAULT_CHANNEL_ID;
  const playlistId = channelToUploadsPlaylistId(channelId);

  try {
    const rawItems = await fetchPlaylistItems(playlistId, apiKey);
    const videoIds = rawItems
      .map((item) => item.contentDetails?.videoId)
      .filter((id): id is string => Boolean(id));

    const durations = await fetchVideoDurations(videoIds, apiKey);
    const items = normalizeItems(rawItems, durations);

    if (items.length === 0) {
      logError("audiobooks", new Error("Empty playlist"));
      return { kind: "unavailable" };
    }

    const data: AudiobookData = {
      channelTitle: "Голос Коваленко — аудиокниги",
      items,
    };

    cache = { data, expiresAt: now + CACHE_TTL_MS };
    return { kind: "ok", data };
  } catch (err) {
    logError("audiobooks", err);
    if (cache) {
      return { kind: "ok", data: cache.data };
    }
    return { kind: "unavailable" };
  }
}
