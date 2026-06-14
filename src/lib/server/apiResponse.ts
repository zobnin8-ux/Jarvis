import type {
  ApiResponse,
  ApiSuccess,
  ApiUnavailable,
  ExternalServiceId,
} from "@/types/api";

export function apiSuccess<T>(data: T): ApiSuccess<T> {
  return { ok: true, data };
}

export function apiUnavailable(service: ExternalServiceId): ApiUnavailable {
  return { ok: false, reason: "unavailable", service };
}

export function jsonResponse<T>(payload: ApiResponse<T>): Response {
  return Response.json(payload);
}
