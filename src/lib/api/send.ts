import { ApiError } from "@/lib/api/client";
import type { ApiErrorCode } from "@/types/api";

/**
 * Like apiClient but tolerates empty responses (204 No Content). Resolves
 * to the parsed JSON body or `undefined`.
 */
export async function apiSend<T = void>(
  url: string,
  init: RequestInit & { json?: unknown } = {}
): Promise<T> {
  const { json, headers, ...rest } = init;
  const res = await fetch(url, {
    ...rest,
    headers: {
      ...(json !== undefined ? { "Content-Type": "application/json" } : null),
      ...headers,
    },
    body: json !== undefined ? JSON.stringify(json) : rest.body,
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => null)) as {
      message?: string;
      code?: ApiErrorCode;
    } | null;
    throw new ApiError(data?.message || "Request failed", res.status, data?.code);
  }
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}
