import type { SpaceLaunch } from "@/types/modules";
import { formatCountdown } from "@/lib/format";
import { fetchNextIssPass } from "@/lib/issPass";
import {
  fetchLaunchNews,
  fetchSpacedevsLaunches,
  POST_LAUNCH_WINDOW_MS,
  spacedevsToLaunch,
  type SpacedevsLaunch,
} from "@/lib/spaceLaunch";

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
  } catch {
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

export async function attachIssPassOptional(
  launch: SpaceLaunch
): Promise<SpaceLaunch> {
  const lat = parseFloat(process.env.WEATHER_LAT ?? "37.338207");
  const lon = parseFloat(process.env.WEATHER_LON ?? "-121.886330");
  const pass = await fetchNextIssPass(lat, lon);
  if (!pass) return launch;
  return { ...launch, issPass: pass };
}
