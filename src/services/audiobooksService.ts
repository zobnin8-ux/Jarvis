import { fetchApiData } from "@/lib/client/apiFetch";
import type { AudiobookData } from "@/types/modules";

export function fetchAudiobooks(): Promise<AudiobookData> {
  return fetchApiData<AudiobookData>("/api/audiobooks");
}
