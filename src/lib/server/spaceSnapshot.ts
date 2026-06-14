import type { SpaceLaunch } from "@/types/modules";
import { formatCountdown } from "@/lib/format";
import {
  fetchLaunchNews,
  fetchSpacedevsLaunches,
  POST_LAUNCH_WINDOW_MS,
  spacedevsToLaunch,
  type SpacedevsLaunch,
} from "@/lib/spaceLaunch";
import { logError } from "@/lib/server/logger";

async function fetchLaunchById(id: string): Promise<SpacedevsLaunch | null> {
  try {
    const response = await fetch(
      `https://ll.thespacedevs.com/2.2.0/launch/${id}/`,
      {
        next: { revalidate: 120 },
        headers: { "User-Agent": "Jarvis-Command-Center/1.0" },
      }
    );

    if (!response.ok) return null;
    return (await response.json()) as SpacedevsLaunch;
  } catch (err) {
    logError("space.launch-by-id", err);
    return null;
  }
}

function isWithinPostLaunchWindow(launch: SpacedevsLaunch): boolean {
  const launchMs = new Date(launch.net).getTime();
  const now = Date.now();
  return launchMs <= now && now - launchMs < POST_LAUNCH_WINDOW_MS;
}

async function buildLaunchResponse(
  launch: SpacedevsLaunch,
  includeNews: boolean
): Promise<SpaceLaunch> {
  const launchMs = new Date(launch.net).getTime();
  const pastLaunch = launchMs <= Date.now();

  const news =
    includeNews && pastLaunch
      ? await fetchLaunchNews(
          launch.name ?? "",
          launch.launch_service_provider?.name ?? "",
          launch.net
        )
      : undefined;

  return spacedevsToLaunch(launch, formatCountdown(launch.net), news);
}

export async function fetchLiveSpaceLaunch(): Promise<SpaceLaunch> {
  const [upcoming, previous] = await Promise.all([
    fetchSpacedevsLaunches("launch/upcoming/?limit=8"),
    fetchSpacedevsLaunches("launch/previous/?limit=5"),
  ]);

  const recentPast = previous.find(isWithinPostLaunchWindow);

  if (recentPast) {
    const detailed = (await fetchLaunchById(recentPast.id)) ?? recentPast;
    return buildLaunchResponse(detailed, true);
  }

  const next =
    upcoming.find((item) => new Date(item.net).getTime() > Date.now()) ??
    upcoming[0];

  if (!next) {
    throw new Error("No launch data from Spacedevs");
  }

  return buildLaunchResponse(next, false);
}

const SPACE_CACHE_TTL_MS = 15 * 60 * 1000;
let spaceCache: { data: SpaceLaunch; expiresAt: number } | null = null;

/** Cached space snapshot — one upstream fetch per 15 min max. */
export async function fetchCachedSpaceLaunch(): Promise<SpaceLaunch> {
  const now = Date.now();
  if (spaceCache && spaceCache.expiresAt > now) {
    return spaceCache.data;
  }

  try {
    const launch = await fetchLiveSpaceLaunch();
    spaceCache = { data: launch, expiresAt: now + SPACE_CACHE_TTL_MS };
    return launch;
  } catch (err) {
    logError("space.snapshot", err);
    if (spaceCache) return spaceCache.data;
    throw err;
  }
}
