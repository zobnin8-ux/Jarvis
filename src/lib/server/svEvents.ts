import type { SvEventsData, SvTickerItem } from "@/types/modules";

const DEMO_ITEMS: SvTickerItem[] = [
  {
    id: "evt-1",
    kind: "event",
    label: "AI Summit SF",
    detail: "Moscone · Thu 18:00",
  },
  {
    id: "stk-aapl",
    kind: "stock",
    label: "AAPL",
    detail: "$198.42",
    change: 0.84,
  },
  {
    id: "evt-2",
    kind: "event",
    label: "Startup Grind",
    detail: "Redwood City · Fri 09:30",
  },
  {
    id: "stk-nvda",
    kind: "stock",
    label: "NVDA",
    detail: "$924.11",
    change: -1.12,
  },
  {
    id: "evt-3",
    kind: "event",
    label: "React Meetup",
    detail: "San Jose · Sat 14:00",
  },
  {
    id: "stk-googl",
    kind: "stock",
    label: "GOOGL",
    detail: "$176.33",
    change: 0.31,
  },
  {
    id: "evt-4",
    kind: "event",
    label: "SpaceX HQ Tour",
    detail: "Hawthorne · waitlist",
  },
  {
    id: "stk-meta",
    kind: "stock",
    label: "META",
    detail: "$512.08",
    change: -0.45,
  },
];

async function fetchFinnhubQuotes(
  apiKey: string,
  symbols: string[]
): Promise<SvTickerItem[]> {
  const results = await Promise.all(
    symbols.map(async (symbol) => {
      const response = await fetch(
        `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${apiKey}`,
        { next: { revalidate: 300 } }
      );
      if (!response.ok) throw new Error(`Finnhub ${response.status}`);
      const json = (await response.json()) as {
        c?: number;
        dp?: number;
      };
      if (json.c == null) return null;
      const item: SvTickerItem = {
        id: `stk-${symbol.toLowerCase()}`,
        kind: "stock",
        label: symbol,
        detail: `$${json.c.toFixed(2)}`,
        change: json.dp ?? 0,
      };
      return item;
    })
  );
  return results.filter((item): item is SvTickerItem => item !== null);
}

export async function resolveSvEvents(): Promise<
  { kind: "demo"; data: SvEventsData } | { kind: "live"; data: SvEventsData } | { kind: "unavailable" }
> {
  const apiKey = process.env.FINNHUB_API_KEY;
  const now = new Date().toISOString();

  if (!apiKey) {
    return {
      kind: "demo",
      data: { items: DEMO_ITEMS, updatedAt: now },
    };
  }

  try {
    const stocks = await fetchFinnhubQuotes(apiKey, [
      "AAPL",
      "NVDA",
      "GOOGL",
      "META",
    ]);
    const events = DEMO_ITEMS.filter((item) => item.kind === "event");
    return {
      kind: "live",
      data: {
        items: [...events, ...stocks],
        updatedAt: now,
      },
    };
  } catch {
    return { kind: "unavailable" };
  }
}
