import { fetchApiData } from "@/lib/client/apiFetch";
import type { IssTelemetryData } from "@/types/modules";

export function fetchIssTelemetry(): Promise<IssTelemetryData | null> {
  return fetchApiData<IssTelemetryData | null>("/api/iss-telemetry");
}
