import "server-only";
import { HttpError } from "@/server/http/api-helpers";

export const notFound = (what = "Resource") => HttpError.notFound(`${what} not found`);

/** Postgres SQLSTATE of a driver error (drizzle wraps it in `cause`). */
export function pgErrorCode(error: unknown): string | undefined {
  let current: unknown = error;
  for (let i = 0; i < 3 && current && typeof current === "object"; i++) {
    const code = (current as { code?: unknown }).code;
    if (typeof code === "string" && /^[0-9A-Z]{5}$/.test(code)) return code;
    current = (current as { cause?: unknown }).cause;
  }
  return undefined;
}

export const PG_UNIQUE_VIOLATION = "23505";
export const PG_FOREIGN_KEY_VIOLATION = "23503";
