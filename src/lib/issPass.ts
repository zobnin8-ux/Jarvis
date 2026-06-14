export interface IssPassResult {
  time: string;
  durationMin: number;
  risetimeIso: string;
}

interface OpenNotifyResponse {
  response?: { risetime: number; duration: number }[];
}

export async function fetchNextIssPass(
  lat: number,
  lon: number
): Promise<IssPassResult | null> {
  try {
    const response = await fetch(
      `https://api.open-notify.org/iss-pass.json?lat=${lat}&lon=${lon}`,
      { next: { revalidate: 1800 } }
    );

    if (!response.ok) return null;

    const json = (await response.json()) as OpenNotifyResponse;
    const passes = json.response ?? [];
    const now = Math.floor(Date.now() / 1000);
    const next = passes.find((pass) => pass.risetime > now);
    if (!next) return null;

    const riseDate = new Date(next.risetime * 1000);
    return {
      time: riseDate.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }),
      durationMin: Math.round(next.duration / 60),
      risetimeIso: riseDate.toISOString(),
    };
  } catch {
    return null;
  }
}

export function demoIssPass(): IssPassResult {
  const rise = new Date();
  rise.setHours(rise.getHours() + 3, 12, 0, 0);
  return {
    time: rise.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }),
    durationMin: 6,
    risetimeIso: rise.toISOString(),
  };
}
