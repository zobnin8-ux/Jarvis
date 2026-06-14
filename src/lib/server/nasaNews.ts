export interface NasaNewsItem {
  title: string;
  link: string;
  pubDate: string;
}

import { logError, logWarn } from "@/lib/server/logger";

const NASA_RSS_URL = "https://www.nasa.gov/rss/dyn/breaking_news.rss";
const CACHE_TTL_MS = 60 * 60 * 1000;

let cache: { data: NasaNewsItem; expiresAt: number } | null = null;

function parseFirstRssItem(xml: string): NasaNewsItem | null {
  const itemBlock = xml.match(/<item[\s\S]*?<\/item>/i)?.[0];
  if (!itemBlock) return null;

  const titleMatch = itemBlock.match(
    /<title>(?:<!\[CDATA\[([\s\S]*?)\]\]>|([^<]*))<\/title>/i
  );
  const title = (titleMatch?.[1] ?? titleMatch?.[2])?.trim();
  const link = itemBlock.match(/<link>([^<]*)<\/link>/i)?.[1]?.trim();
  const pubDate =
    itemBlock.match(/<pubDate>([^<]*)<\/pubDate>/i)?.[1]?.trim() ?? "";

  if (!title || !link) return null;
  return { title, link, pubDate };
}

export async function fetchNasaNewsHeadline(): Promise<NasaNewsItem | null> {
  const now = Date.now();
  if (cache && cache.expiresAt > now) {
    return cache.data;
  }

  try {
    const response = await fetch(NASA_RSS_URL, {
      headers: { "User-Agent": "Jarvis-Command-Center/1.0" },
      next: { revalidate: 3600 },
    });

    if (!response.ok) {
      logWarn("nasa-news", `HTTP ${response.status}`);
      return cache?.data ?? null;
    }

    const xml = await response.text();
    const item = parseFirstRssItem(xml);
    if (!item) return cache?.data ?? null;

    cache = { data: item, expiresAt: now + CACHE_TTL_MS };
    return item;
  } catch (err) {
    logError("nasa-news", err);
    return cache?.data ?? null;
  }
}
