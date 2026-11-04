import { translateApiErrorCode } from "./error-i18n";
import type { ApiErrorCode } from "@/types/api";

/**
 * Error thrown for every non-2xx response. `code` follows the shared HTTP
 * contract (src/types/api.ts); legacy endpoints that still answer with
 * `{ error }` get `code: undefined`.
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: ApiErrorCode,
    /** Extra details, e.g. `{ distance_m, max_distance_m }` for TOO_FAR. */
    public issues?: unknown
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function toApiError(res: Response, fallback: string): Promise<ApiError> {
  const data = (await res.json().catch(() => null)) as {
    message?: string;
    error?: string;
    code?: ApiErrorCode;
    issues?: unknown;
  } | null;
  return new ApiError(
    data?.message || data?.error || fallback,
    res.status,
    data?.code,
    data?.issues
  );
}

export async function apiClient<T>(
  url: string,
  options?: RequestInit
): Promise<T> {
  const res = await fetch(url, {
    ...options,
    headers: {
      ...(options?.body ? { "Content-Type": "application/json" } : null),
      ...options?.headers,
    },
  });

  if (!res.ok) throw await toApiError(res, "Request failed");
  return res.json();
}

export async function apiFormData<T>(
  url: string,
  formData: FormData,
  options?: Omit<RequestInit, "body">
): Promise<T> {
  const res = await fetch(url, { method: "POST", ...options, body: formData });
  if (!res.ok) throw await toApiError(res, "Upload failed");
  return res.json();
}

/**
 * Human readable message for any thrown value. In a non-English UI, API and
 * network errors get a translated message by code (server text is English).
 */
export function errorMessage(error: unknown, fallback = "Something went wrong") {
  if (error instanceof ApiError) {
    const translated = translateApiErrorCode(error.code ?? "UNKNOWN");
    if (translated) return translated;
  } else if (error instanceof TypeError) {
    // fetch() network failure ("Failed to fetch").
    const translated = translateApiErrorCode("NETWORK");
    if (translated) return translated;
  }
  return error instanceof Error && error.message ? error.message : fallback;
}
