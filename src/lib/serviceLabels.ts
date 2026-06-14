import type { ExternalServiceId } from "@/types/api";

const SERVICE_LABELS: Record<ExternalServiceId, string> = {
  openweather: "Погода",
  "google-calendar": "Календарь",
  spacedevs: "Космос",
  claude: "Брифинг",
};

export function serviceUnavailableMessage(service: string): string {
  const label =
    SERVICE_LABELS[service as ExternalServiceId] ?? "Сервис";
  return `${label} временно недоступен`;
}
