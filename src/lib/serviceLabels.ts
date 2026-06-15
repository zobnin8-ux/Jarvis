import type { ExternalServiceId } from "@/types/api";

const SERVICE_LABELS: Record<ExternalServiceId, string> = {
  openweather: "Погода",
  "google-calendar": "Календарь",
  gmail: "Почта",
  spacedevs: "Космос",
  claude: "Брифинг",
  elevenlabs: "Озвучка",
  "sv-events": "Silicon Valley",
  "world-news": "Новости",
  youtube: "Библиотека",
};

export function serviceUnavailableMessage(service: string): string {
  if (service === "world-news") {
    return "Новости временно недоступны";
  }
  if (service === "youtube") {
    return "Библиотека временно недоступна";
  }
  if (service === "gmail") {
    return "Почта временно недоступна";
  }
  const label =
    SERVICE_LABELS[service as ExternalServiceId] ?? "Сервис";
  return `${label} временно недоступен`;
}
