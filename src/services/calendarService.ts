import type { CalendarData } from "@/types/modules";
import { fetchApiData } from "@/lib/client/apiFetch";

export async function fetchCalendar(): Promise<CalendarData> {
  return fetchApiData<CalendarData>("/api/calendar");
}
