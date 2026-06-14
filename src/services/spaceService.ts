import type { SpaceLaunch } from "@/types/modules";
import { fetchApiData } from "@/lib/client/apiFetch";

export async function fetchSpaceLaunch(): Promise<SpaceLaunch> {
  return fetchApiData<SpaceLaunch>("/api/space");
}
