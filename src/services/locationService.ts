import { fetchApiData } from "@/lib/client/apiFetch";
import type { LocationData } from "@/types/modules";

export async function fetchLocation(): Promise<LocationData> {
  return fetchApiData<LocationData>("/api/location");
}
