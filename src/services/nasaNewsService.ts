import { fetchApiData } from "@/lib/client/apiFetch";

export interface NasaNewsHeadline {
  title: string;
  link: string;
  pubDate: string;
}

export function fetchNasaNews(): Promise<NasaNewsHeadline | null> {
  return fetchApiData<NasaNewsHeadline | null>("/api/nasa-news");
}
