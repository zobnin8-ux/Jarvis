export type ExternalServiceId =
  | "openweather"
  | "google-calendar"
  | "spacedevs"
  | "claude"
  | "elevenlabs"
  | "sv-events";

export type UnavailableReason = "unavailable";

export interface ApiSuccess<T> {
  ok: true;
  data: T;
}

export interface ApiUnavailable {
  ok: false;
  reason: UnavailableReason;
  service: ExternalServiceId;
}

export type ApiResponse<T> = ApiSuccess<T> | ApiUnavailable;

export function isApiSuccess<T>(
  body: ApiResponse<T>
): body is ApiSuccess<T> {
  return body.ok === true;
}

export function isApiUnavailable(
  body: ApiResponse<unknown>
): body is ApiUnavailable {
  return body.ok === false;
}
