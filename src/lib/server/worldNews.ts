import { NEWS_FEEDS, type NewsFeed } from "@/config/news";
import { logError, logWarn } from "@/lib/server/logger";
import type { NewsHeadline, WorldNewsData } from "@/types/modules";

const ITEMS_PER_FEED = 5;
const POOL_CAP = 12;
const CACHE_TTL_MS = 10 * 60 * 1000;

let cache: { data: WorldNewsData; expiresAt: number } | null = null;

interface ParsedRssItem {
  title: string;
  link: string;
  pubDate: string;
}

function decodeXmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'");
}

function extractTag(block: string, tag: string): string | null {
  const match = block.match(
    new RegExp(`<${tag}>(?:<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>|([^<]*))</${tag}>`, "i")
  );
  const value = (match?.[1] ?? match?.[2])?.trim();
  return value ? decodeXmlEntities(value) : null;
}

function parseRssItems(xml: string): ParsedRssItem[] {
  const blocks = xml.match(/<item[\s\S]*?<\/item>/gi) ?? [];
  const items: ParsedRssItem[] = [];

  for (const block of blocks) {
    const title = extractTag(block, "title");
    const link =
      extractTag(block, "link") ??
      block.match(/<link[^>]*href="([^"]+)"/i)?.[1]?.trim() ??
      null;
    const pubDate =
      extractTag(block, "pubDate") ??
      extractTag(block, "updated") ??
      extractTag(block, "dc:date") ??
      "";

    if (!title || !link) continue;
    items.push({ title, link, pubDate });
  }

  return items;
}

function toIsoDate(pubDate: string): string {
  if (!pubDate) return new Date().toISOString();
  const parsed = new Date(pubDate);
  return Number.isNaN(parsed.getTime())
    ? new Date().toISOString()
    : parsed.toISOString();
}

function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

function dedupeByTitle(headlines: NewsHeadline[]): NewsHeadline[] {
  const seen = new Set<string>();
  const result: NewsHeadline[] = [];

  for (const item of headlines) {
    const key = normalizeTitle(item.title);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    result.push(item);
  }

  return result;
}

function interleaveRuEn(ru: NewsHeadline[], en: NewsHeadline[]): NewsHeadline[] {
  const merged: NewsHeadline[] = [];
  const maxLen = Math.max(ru.length, en.length);

  for (let i = 0; i < maxLen && merged.length < POOL_CAP; i++) {
    if (ru[i] && merged.length < POOL_CAP) merged.push(ru[i]);
    if (en[i] && merged.length < POOL_CAP) merged.push(en[i]);
  }

  return merged;
}

async function fetchFeedItems(feed: NewsFeed): Promise<NewsHeadline[]> {
  const response = await fetch(feed.url, {
    headers: { "User-Agent": "Jarvis-Command-Center/1.0" },
    next: { revalidate: 600 },
  });

  if (!response.ok) {
    throw new Error(`${feed.label} HTTP ${response.status}`);
  }

  const xml = await response.text();
  const items = parseRssItems(xml).slice(0, ITEMS_PER_FEED);

  return items.map((item) => ({
    source: feed.id,
    sourceLabel: feed.label,
    lang: feed.lang,
    title: item.title,
    url: item.link,
    publishedAt: toIsoDate(item.pubDate),
  }));
}

const DEMO_HEADLINES: NewsHeadline[] = [
  {
    source: "ria",
    sourceLabel: "РИА Новости",
    lang: "ru",
    title: "Demo: мировые события — лента временно недоступна",
    url: "https://ria.ru/",
    publishedAt: new Date().toISOString(),
  },
  {
    source: "bbc-world",
    sourceLabel: "BBC World",
    lang: "en",
    title: "Demo: world headlines feed offline in development",
    url: "https://www.bbc.com/news/world",
    publishedAt: new Date().toISOString(),
  },
];

function buildWorldNewsPayload(headlines: NewsHeadline[]): WorldNewsData {
  return {
    headlines,
    generatedAt: new Date().toISOString(),
  };
}

export async function fetchWorldNewsSnapshot(): Promise<
  | { kind: "ok"; data: WorldNewsData }
  | { kind: "demo"; data: WorldNewsData }
  | { kind: "unavailable" }
> {
  const now = Date.now();
  if (cache && cache.expiresAt > now) {
    return { kind: "ok", data: cache.data };
  }

  const results = await Promise.allSettled(
    NEWS_FEEDS.map((feed) => fetchFeedItems(feed))
  );

  const ru: NewsHeadline[] = [];
  const en: NewsHeadline[] = [];

  results.forEach((result, index) => {
    const feed = NEWS_FEEDS[index];
    if (result.status === "fulfilled") {
      const bucket = feed.lang === "ru" ? ru : en;
      bucket.push(...result.value);
      return;
    }
    logError(
      "world-news",
      new Error(`${feed.label}: ${result.reason instanceof Error ? result.reason.message : String(result.reason)}`)
    );
  });

  if (ru.length === 0 && en.length === 0) {
    if (process.env.NODE_ENV === "development") {
      logWarn("world-news", "All feeds failed — serving demo headlines");
      const data = buildWorldNewsPayload(DEMO_HEADLINES);
      cache = { data, expiresAt: now + CACHE_TTL_MS };
      return { kind: "demo", data };
    }
    return { kind: "unavailable" };
  }

  const sortByFreshness = (a: NewsHeadline, b: NewsHeadline) =>
    new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();

  const ruSorted = dedupeByTitle(ru).sort(sortByFreshness);
  const enSorted = dedupeByTitle(en).sort(sortByFreshness);
  const headlines = interleaveRuEn(ruSorted, enSorted);

  if (headlines.length === 0) {
    return { kind: "unavailable" };
  }

  const data = buildWorldNewsPayload(headlines);
  cache = { data, expiresAt: now + CACHE_TTL_MS };
  return { kind: "ok", data };
}
