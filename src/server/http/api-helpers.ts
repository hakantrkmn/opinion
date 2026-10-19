import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import { ZodError, type ZodType } from "zod";
import { headers as nextHeaders } from "next/headers";
import { eq } from "drizzle-orm";
import { auth } from "@/server/auth/auth";
import { db } from "@/server/db";
import { user as userTable } from "@/server/db/schema/auth";
import {
  rateLimit,
  buildRateKey,
  type RateLimitOptions,
} from "@/server/http/rate-limit";
import type { ApiErrorCode as ContractErrorCode, ApiError } from "@/types/api";

export type ApiSession = NonNullable<
  Awaited<ReturnType<typeof auth.api.getSession>>
>;

/**
 * Error codes from the public contract (src/types/api.ts). The legacy keys
 * are kept as aliases so older call sites keep compiling, but they all map
 * to a contract code — clients only ever see the values on the right.
 */
export const ApiErrorCode = {
  BAD_REQUEST: "BAD_REQUEST",
  VALIDATION_ERROR: "VALIDATION_ERROR",
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  NOT_FOUND: "NOT_FOUND",
  CONFLICT: "CONFLICT",
  RATE_LIMITED: "RATE_LIMITED",
  TOO_FAR: "TOO_FAR",
  INTERNAL_ERROR: "INTERNAL_ERROR",
  /** @deprecated use VALIDATION_ERROR */
  VALIDATION_FAILED: "VALIDATION_ERROR",
  /** @deprecated use BAD_REQUEST */
  INVALID_JSON: "BAD_REQUEST",
  /** @deprecated use BAD_REQUEST */
  INVALID_FORM_DATA: "BAD_REQUEST",
  /** @deprecated use BAD_REQUEST */
  INVALID_PHOTO_METADATA: "BAD_REQUEST",
  /** @deprecated use FORBIDDEN */
  CSRF_MISSING_HOST: "FORBIDDEN",
  /** @deprecated use FORBIDDEN */
  CSRF_MISSING_ORIGIN: "FORBIDDEN",
  /** @deprecated use FORBIDDEN */
  CSRF_INVALID_ORIGIN: "FORBIDDEN",
} as const satisfies Record<string, ContractErrorCode>;

export type ApiErrorCode = ContractErrorCode;

export function json<T>(body: T, init?: ResponseInit) {
  return NextResponse.json(body, init);
}

/** 204 No Content. */
export function noContent() {
  return new NextResponse(null, { status: 204 });
}

/** Unified error response: `ApiError` body + matching HTTP status. */
export function errorResponse(
  status: number,
  code: ApiErrorCode,
  message: string,
  extras?: { issues?: unknown }
) {
  const body: ApiError = { message, code, status, ...(extras ?? {}) };
  return NextResponse.json(body, { status });
}

export const errors = {
  badRequest: (message = "Bad request") =>
    errorResponse(400, "BAD_REQUEST", message),
  unauthorized: (message = "Sign in required") =>
    errorResponse(401, "UNAUTHORIZED", message),
  forbidden: (message = "Forbidden") =>
    errorResponse(403, "FORBIDDEN", message),
  notFound: (message = "Not found") =>
    errorResponse(404, "NOT_FOUND", message),
  conflict: (message = "Conflict") => errorResponse(409, "CONFLICT", message),
  internal: (message = "Internal server error") =>
    errorResponse(500, "INTERNAL_ERROR", message),
};

// ---------------------------------------------------------------------------
// Sessions
// ---------------------------------------------------------------------------

function hasBearer(h: Headers): boolean {
  return /^bearer\s+\S+/i.test(h.get("authorization") ?? "");
}

/**
 * Request headers to hand to better-auth. Requests carrying
 * `Authorization: Bearer` (mobile) are authenticated ONLY by that token —
 * the cookie header is dropped — so the CSRF exemption for bearer requests
 * can never be used to ride on a browser cookie.
 */
export async function authHeaders(): Promise<Headers> {
  const h = new Headers(await nextHeaders());
  if (hasBearer(h)) h.delete("cookie");
  return h;
}

/** Resolve the current session (cookie or bearer), or null. */
export async function getSession(): Promise<ApiSession | null> {
  try {
    return await auth.api.getSession({ headers: await authHeaders() });
  } catch {
    return null;
  }
}

type SessionResult =
  | { session: ApiSession; error: null }
  | { session: null; error: NextResponse };

export async function requireSession(): Promise<SessionResult> {
  const session = await getSession();
  if (!session) return { session: null, error: errors.unauthorized() };
  return { session, error: null };
}

/**
 * Admin guard. Sessions are not cookie-cached (see auth.ts) so `role` is
 * already fresh, but we re-read role + deleted_at from the DB anyway so a
 * demoted / deleted admin loses access immediately.
 */
export async function requireAdmin(): Promise<SessionResult> {
  const session = await getSession();
  if (!session) return { session: null, error: errors.unauthorized() };
  const [row] = await db
    .select({ role: userTable.role, deletedAt: userTable.deletedAt })
    .from(userTable)
    .where(eq(userTable.id, session.user.id))
    .limit(1);
  if (!row || row.deletedAt) {
    return { session: null, error: errors.unauthorized() };
  }
  if (row.role !== "admin") {
    return { session: null, error: errors.forbidden("Admin access required") };
  }
  return { session, error: null };
}

// ---------------------------------------------------------------------------
// Input parsing
// ---------------------------------------------------------------------------

export async function parseBody<T>(
  request: NextRequest,
  schema: ZodType<T>
): Promise<{ data: T; error: null } | { data: null; error: NextResponse }> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return { data: null, error: errors.badRequest("Invalid JSON body") };
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return { data: null, error: zodErrorResponse(parsed.error) };
  }
  return { data: parsed.data, error: null };
}

export function parseQuery<T>(
  request: NextRequest,
  schema: ZodType<T>
): { data: T; error: null } | { data: null; error: NextResponse } {
  const { searchParams } = new URL(request.url);
  const obj: Record<string, string> = {};
  searchParams.forEach((v, k) => {
    obj[k] = v;
  });
  const parsed = schema.safeParse(obj);
  if (!parsed.success) {
    return { data: null, error: zodErrorResponse(parsed.error) };
  }
  return { data: parsed.data, error: null };
}

export function parseParams<T>(
  params: unknown,
  schema: ZodType<T>
): { data: T; error: null } | { data: null; error: NextResponse } {
  const parsed = schema.safeParse(params);
  if (!parsed.success) {
    return { data: null, error: errors.badRequest("Invalid id") };
  }
  return { data: parsed.data, error: null };
}

/**
 * Reject a request body before buffering it: requires a Content-Length
 * header (chunked uploads would otherwise be buffered unbounded) and caps it.
 */
export function enforceBodyLimit(
  request: NextRequest,
  maxBytes: number
): NextResponse | null {
  const raw = request.headers.get("content-length");
  const declared = raw === null ? NaN : Number(raw);
  if (!Number.isFinite(declared) || declared < 0) {
    return errorResponse(411, "BAD_REQUEST", "Content-Length header is required");
  }
  if (declared > maxBytes) {
    return errorResponse(413, "BAD_REQUEST", "Request body is too large");
  }
  return null;
}

export async function parseFormData<T>(
  request: NextRequest,
  schema: ZodType<T>,
  options: { maxBytes?: number } = {}
): Promise<
  | { data: T; formData: FormData; error: null }
  | { data: null; formData: null; error: NextResponse }
> {
  if (options.maxBytes !== undefined) {
    const tooLarge = enforceBodyLimit(request, options.maxBytes);
    if (tooLarge) return { data: null, formData: null, error: tooLarge };
  }
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return {
      data: null,
      formData: null,
      error: errors.badRequest("Invalid form data"),
    };
  }
  const obj: Record<string, unknown> = {};
  for (const [key, value] of formData.entries()) {
    if (value instanceof File) continue;
    // Legacy: JSON-encoded photoMetadata field used by the pin form.
    if (key === "photoMetadata" && value.length > 0) {
      try {
        obj[key] = JSON.parse(value);
      } catch {
        return {
          data: null,
          formData: null,
          error: errors.badRequest("Invalid photoMetadata"),
        };
      }
      continue;
    }
    obj[key] = value;
  }
  const parsed = schema.safeParse(obj);
  if (!parsed.success) {
    return { data: null, formData: null, error: zodErrorResponse(parsed.error) };
  }
  return { data: parsed.data, formData, error: null };
}

export function zodErrorResponse(err: ZodError) {
  return errorResponse(400, "VALIDATION_ERROR", "Validation failed", {
    issues: err.issues.map((i) => ({
      path: i.path.join("."),
      message: i.message,
    })),
  });
}

// ---------------------------------------------------------------------------
// Rate limiting
// ---------------------------------------------------------------------------

export function enforceRateLimit(
  request: NextRequest | Request,
  scope: string,
  limits: Omit<RateLimitOptions, "key">,
  userId?: string | null
): NextResponse | null {
  const result = rateLimit({
    key: buildRateKey(scope, request, userId ?? null),
    ...limits,
  });
  if (result.allowed) return null;
  const retryAfter = Math.max(1, Math.ceil((result.resetAt - Date.now()) / 1000));
  const body: ApiError = {
    message: "Too many requests",
    code: "RATE_LIMITED",
    status: 429,
  };
  return NextResponse.json(body, {
    status: 429,
    headers: {
      "Retry-After": String(retryAfter),
      "X-RateLimit-Remaining": String(result.remaining),
    },
  });
}

// ---------------------------------------------------------------------------
// CSRF
// ---------------------------------------------------------------------------

/** Origins allowed for cookie-authenticated, state-changing requests. */
function allowedOrigins(request: NextRequest): Set<string> {
  const origins = new Set<string>();
  for (const value of [
    process.env.BETTER_AUTH_URL,
    process.env.NEXT_PUBLIC_SITE_URL,
  ]) {
    if (!value) continue;
    try {
      origins.add(new URL(value).origin);
    } catch {
      /* ignore malformed env */
    }
  }
  // Same-origin: the Host header cannot be forged by a cross-site page, and
  // behind the TLS-terminating proxy the scheme may differ, so allow both.
  const host = request.headers.get("host");
  if (host) {
    origins.add(`http://${host}`);
    origins.add(`https://${host}`);
  }
  return origins;
}

// Native apps using cookies (via @better-auth/expo) send this scheme as
// Origin. Bearer-authenticated requests skip the check entirely.
const NATIVE_ORIGINS = new Set<string>(["opinionmobile://"]);

/**
 * Origin check for cookie-authenticated mutations. Requests that carry a
 * Bearer token are exempt: `getSession()` ignores cookies for them, so they
 * can only be authenticated by a token a cross-site page cannot attach.
 */
export function checkCsrfOrigin(request: NextRequest): NextResponse | null {
  const method = request.method.toUpperCase();
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") return null;
  if (hasBearer(request.headers)) return null;

  const origin = request.headers.get("origin");
  let source = origin;
  if (!source) {
    const referer = request.headers.get("referer");
    if (referer) {
      try {
        source = new URL(referer).origin;
      } catch {
        source = null;
      }
    }
  }
  if (!source) return errors.forbidden("Missing origin");
  if (NATIVE_ORIGINS.has(source)) return null;

  let normalized: string;
  try {
    normalized = new URL(source).origin;
  } catch {
    return errors.forbidden("Invalid origin");
  }
  if (!allowedOrigins(request).has(normalized)) {
    return errors.forbidden("Invalid origin");
  }
  return null;
}

// ---------------------------------------------------------------------------
// Typed service errors
// ---------------------------------------------------------------------------

/**
 * Throw from services to produce a specific HTTP error; anything else that
 * escapes a route handler becomes a logged 500.
 */
export class HttpError extends Error {
  constructor(
    public status: number,
    public code: ApiErrorCode,
    message: string
  ) {
    super(message);
    this.name = "HttpError";
  }

  static badRequest(message = "Bad request") {
    return new HttpError(400, "BAD_REQUEST", message);
  }
  static forbidden(message = "Forbidden") {
    return new HttpError(403, "FORBIDDEN", message);
  }
  static notFound(message = "Not found") {
    return new HttpError(404, "NOT_FOUND", message);
  }
  static conflict(message = "Conflict") {
    return new HttpError(409, "CONFLICT", message);
  }
}

export function handleRouteError(error: unknown, context: string): NextResponse {
  if (error instanceof HttpError) {
    return errorResponse(error.status, error.code, error.message);
  }
  console.error(`[api] ${context}:`, error);
  return errors.internal();
}
