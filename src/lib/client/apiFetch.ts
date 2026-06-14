import {
  isApiSuccess,
  isApiUnavailable,
  type ApiResponse,
} from "@/types/api";

export class ServiceUnavailableError extends Error {
  readonly service: string;

  constructor(service: string) {
    super("service-unavailable");
    this.name = "ServiceUnavailableError";
    this.service = service;
  }
}

export function isServiceUnavailableError(
  error: unknown
): error is ServiceUnavailableError {
  return error instanceof ServiceUnavailableError;
}

export async function fetchApiData<T>(url: string): Promise<T> {
  const response = await fetch(url, { cache: "no-store" });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const body = (await response.json()) as ApiResponse<T>;

  if (isApiUnavailable(body)) {
    throw new ServiceUnavailableError(body.service);
  }

  if (isApiSuccess(body)) {
    return body.data;
  }

  throw new Error("Invalid API response");
}
