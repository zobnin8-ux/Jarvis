import type {
  LaunchDetailLine,
  LaunchOutcome,
  LaunchPhase,
  SpaceLaunch,
} from "@/types/modules";

export const POST_LAUNCH_WINDOW_MS = 12 * 60 * 60 * 1000;
export const LIFTOFF_PENDING_MS = 30 * 60 * 1000;

export interface SpacedevsLaunch {
  id: string;
  name: string;
  net: string;
  status?: {
    id?: number;
    name?: string;
    abbrev?: string;
    description?: string;
  };
  mission?: {
    description?: string;
    type?: string;
    orbit?: { name?: string; abbrev?: string };
  };
  launch_service_provider?: { name?: string };
  rocket?: { configuration?: { full_name?: string } };
  pad?: {
    name?: string;
    latitude?: string;
    longitude?: string;
    location?: { name?: string };
  };
}

export function isSpaceXOrNasa(operator: string): boolean {
  const value = operator.toLowerCase();
  return value.includes("spacex") || value.includes("nasa");
}

export function mapOutcome(statusId?: number): LaunchOutcome {
  switch (statusId) {
    case 3:
      return "SUCCESS";
    case 4:
      return "FAILURE";
    case 7:
      return "PARTIAL";
    case 5:
      return "PENDING";
    default:
      return "UNKNOWN";
  }
}

export function mapLegacyStatus(
  outcome: LaunchOutcome,
  phase: LaunchPhase
): SpaceLaunch["status"] {
  if (phase === "countdown") return "UPCOMING";
  if (phase === "liftoff" || outcome === "PENDING") return "LAUNCHED";
  if (outcome === "SUCCESS" || outcome === "PARTIAL") return "SUCCESS";
  if (outcome === "FAILURE") return "FAILURE";
  return "LAUNCHED";
}

export function resolveLaunchPhase(
  launchTimeIso: string,
  outcome: LaunchOutcome
): LaunchPhase {
  const launchMs = new Date(launchTimeIso).getTime();
  const now = Date.now();
  const elapsed = now - launchMs;

  if (elapsed < 0) return "countdown";
  if (elapsed > POST_LAUNCH_WINDOW_MS) return "countdown";

  if (outcome === "PENDING" && elapsed < LIFTOFF_PENDING_MS) {
    return "liftoff";
  }

  return "postlaunch";
}

function collectText(launch: SpacedevsLaunch, extra = ""): string {
  return [
    launch.status?.description,
    launch.status?.name,
    launch.mission?.description,
    launch.name,
    extra,
  ]
    .filter(Boolean)
    .join(" ");
}

function extractOrbitLine(launch: SpacedevsLaunch): LaunchDetailLine | null {
  const orbit = launch.mission?.orbit?.name ?? launch.mission?.orbit?.abbrev;
  if (!orbit) return null;
  return { label: "Orbit", value: orbit };
}

function extractBoosterLine(
  launch: SpacedevsLaunch,
  text: string
): LaunchDetailLine | null {
  const operator = launch.launch_service_provider?.name ?? "";
  if (!operator.toLowerCase().includes("spacex")) return null;

  const lower = text.toLowerCase();

  const landedMatch = lower.match(
    /(?:landed on|landing on|successful landing)\s+([a-z0-9\s-]+)/i
  );
  if (landedMatch) {
    const site = landedMatch[1].trim().split(/[.,]/)[0];
    return { label: "Booster", value: `recovered · ${site}` };
  }

  if (/rtls|return to launch site|landing zone/i.test(lower)) {
    return { label: "Booster", value: "RTLS recovery" };
  }

  if (/asds|droneship|ocisly|asog|jrti|shortfall of gravitas/i.test(lower)) {
    return { label: "Booster", value: "ASDS recovery" };
  }

  if (/expended|no recovery|not recovered/i.test(lower)) {
    return { label: "Booster", value: "expended" };
  }

  if (mapOutcome(launch.status?.id) === "SUCCESS") {
    return { label: "Booster", value: "recovery pending" };
  }

  return null;
}

function extractPayloadLine(
  launch: SpacedevsLaunch,
  text: string
): LaunchDetailLine | null {
  const lower = text.toLowerCase();

  if (/payload deployment|satellites deployed|deployment confirmed|inserted into orbit/i.test(lower)) {
    return { label: "Payload", value: "deployed to orbit" };
  }

  if (/dock(?:ed|ing)|iss arrival|station approach/i.test(lower)) {
    return { label: "Payload", value: "docking sequence" };
  }

  if (mapOutcome(launch.status?.id) === "SUCCESS") {
    const type = launch.mission?.type;
    if (type) return { label: "Payload", value: `${type.toLowerCase()} · nominal` };
    return { label: "Payload", value: "mission nominal" };
  }

  return null;
}

function extractOutcomeLine(outcome: LaunchOutcome, launch: SpacedevsLaunch): LaunchDetailLine {
  const statusText = launch.status?.description ?? launch.status?.name;
  if (outcome === "PENDING") {
    return { label: "Outcome", value: "awaiting telemetry" };
  }
  if (statusText && statusText.length < 80) {
    return { label: "Outcome", value: statusText };
  }
  return { label: "Outcome", value: outcome.toLowerCase() };
}

export function buildLaunchDetails(
  launch: SpacedevsLaunch,
  outcome: LaunchOutcome,
  newsHeadline?: string
): LaunchDetailLine[] {
  const text = collectText(launch, newsHeadline ?? "");
  const lines: LaunchDetailLine[] = [extractOutcomeLine(outcome, launch)];

  const orbit = extractOrbitLine(launch);
  if (orbit) lines.push(orbit);

  const booster = extractBoosterLine(launch, text);
  if (booster) lines.push(booster);

  const payload = extractPayloadLine(launch, text);
  if (payload) lines.push(payload);

  return lines;
}

export function spacedevsToLaunch(
  launch: SpacedevsLaunch,
  countdown: string,
  news?: { headline: string; source: string }
): SpaceLaunch {
  const operator = launch.launch_service_provider?.name ?? "Unknown";
  const outcome = mapOutcome(launch.status?.id);
  const phase = resolveLaunchPhase(launch.net, outcome);
  const launchMs = new Date(launch.net).getTime();
  const postLaunchExpiresAt =
    launchMs > 0
      ? new Date(launchMs + POST_LAUNCH_WINDOW_MS).toISOString()
      : undefined;

  const lat = parseFloat(launch.pad?.latitude ?? "0");
  const lon = parseFloat(launch.pad?.longitude ?? "0");
  const padName =
    launch.pad?.location?.name ?? launch.pad?.name ?? "Unknown Launch Site";

  return {
    launchId: launch.id,
    operator,
    rocket:
      launch.rocket?.configuration?.full_name ?? launch.name ?? "Unknown",
    mission: launch.name ?? "Unnamed Mission",
    padName,
    latitude: Number.isFinite(lat) ? lat : 0,
    longitude: Number.isFinite(lon) ? lon : 0,
    countdown,
    status: mapLegacyStatus(outcome, phase),
    launchTime: launch.net,
    phase,
    outcome,
    detailLines: buildLaunchDetails(launch, outcome, news?.headline),
    newsHeadline: news?.headline,
    newsSource: news?.source,
    postLaunchExpiresAt,
  };
}

interface NewsArticle {
  title: string;
  news_site: string;
  published_at: string;
}

export async function fetchLaunchNews(
  mission: string,
  operator: string,
  launchTimeIso: string
): Promise<{ headline: string; source: string } | undefined> {
  if (!isSpaceXOrNasa(operator)) return undefined;

  const launchMs = new Date(launchTimeIso).getTime();
  if (Number.isNaN(launchMs)) return undefined;

  try {
    const query = encodeURIComponent(mission.split("|")[0].trim().slice(0, 80));
    const response = await fetch(
      `https://api.spaceflightnewsapi.net/v4/articles/?search=${query}&limit=12`,
      { next: { revalidate: 300 } }
    );

    if (!response.ok) return undefined;

    const json = (await response.json()) as { results?: NewsArticle[] };
    const articles = json.results ?? [];

    const match = articles.find((article) => {
      const published = new Date(article.published_at).getTime();
      if (published < launchMs - 2 * 60 * 60 * 1000) return false;

      const title = article.title.toLowerCase();
      const missionTokens = mission
        .toLowerCase()
        .split(/[\s|()\-]+/)
        .filter((t) => t.length > 3)
        .slice(0, 4);

      return missionTokens.some((token) => title.includes(token));
    });

    if (!match) return undefined;

    return { headline: match.title, source: match.news_site };
  } catch {
    return undefined;
  }
}

export function formatPostLaunchRemaining(expiresAt?: string): string | null {
  if (!expiresAt) return null;
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (ms <= 0) return null;

  const hours = Math.floor(ms / (1000 * 60 * 60));
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
  return `${hours}h ${minutes}m`;
}

export async function fetchSpacedevsLaunches(
  relativePath: string
): Promise<SpacedevsLaunch[]> {
  const response = await fetch(
    `https://ll.thespacedevs.com/2.2.0/${relativePath}`,
    {
      next: { revalidate: 120 },
      headers: { "User-Agent": "Jarvis-Command-Center/1.0" },
    }
  );

  if (!response.ok) {
    throw new Error(`Spacedevs API error: ${response.status}`);
  }

  const json = (await response.json()) as { results?: SpacedevsLaunch[] };
  return json.results ?? [];
}
