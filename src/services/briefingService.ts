import type { BriefingData } from "@/types/modules";
import { fetchApiData } from "@/lib/client/apiFetch";

export async function fetchBriefing(): Promise<BriefingData> {
  return fetchApiData<BriefingData>("/api/briefing");
}
