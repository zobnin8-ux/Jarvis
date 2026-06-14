import { fetchApiData } from "@/lib/client/apiFetch";
import type { WorldNewsData } from "@/types/modules";

export function fetchWorldNews(): Promise<WorldNewsData> {
  return fetchApiData<WorldNewsData>("/api/world-news");
}
