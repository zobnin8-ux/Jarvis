import type { SvEventsData } from "@/types/modules";
import { fetchApiData } from "@/lib/client/apiFetch";

export async function fetchSvEvents(): Promise<SvEventsData> {
  return fetchApiData<SvEventsData>("/api/sv-events");
}
