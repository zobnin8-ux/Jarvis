import { fetchApiData } from "@/lib/client/apiFetch";
import type { GmailData } from "@/types/modules";

export function fetchGmail(): Promise<GmailData> {
  return fetchApiData<GmailData>("/api/gmail");
}
