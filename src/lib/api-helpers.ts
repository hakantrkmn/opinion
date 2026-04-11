import { NextResponse, type NextRequest } from "next/server";
import { ZodError, type ZodType } from "zod";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { rateLimit, buildRateKey, type RateLimitOptions } from "@/lib/rate-limit";

export type ApiSession = Awaited<ReturnType<typeof auth.api.getSession>>;

// Unified error code dictionary. Mirrors the codes the mobile client maps in
// lib/errors.ts (mapErrorCode). Add new entries here as routes need them.
export const ApiErrorCode = {
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  NOT_FOUND: "NOT_FOUND",
  BAD_REQUEST: "BAD_REQUEST",
  VALIDATION_FAILED: "VALIDATION_FAILED",
  INVALID_JSON: "INVALID_JSON",
  INVALID_FORM_DATA: "INVALID_FORM_DATA",
  INVALID_PHOTO_METADATA: "INVALID_PHOTO_METADATA",
  RATE_LIMITED: "RATE_LIMITED",
  CSRF_MISSING_HOST: "CSRF_MISSING_HOST",
  CSRF_MISSING_ORIGIN: "CSRF_MISSING_ORIGIN",
  CSRF_INVALID_ORIGIN: "CSRF_INVALID_ORIGIN",
  INTERNAL_ERROR: "INTERNAL_ERROR",
  CONFLICT: "CONFLICT",
} as const;

export type ApiErrorCode = typeof ApiErrorCode[keyof typeof ApiErrorCode];

export function json(body: unknown, init?: ResponseInit) {
  return NextResponse.json(body, init);
}

// Unified error response shape: { message, code, status, ...extras }
// This matches the shape better-auth already returns, so the mobile client
// can parse all error responses through a single path.
export function errorResponse(
  status: number,
  code: ApiErrorCode | string,
  message: string,
  extras?: Record<string, unknown>
) {
  return NextResponse.json(
    { message, code, status, ...(extras ?? {}) },
    { status }
  );
}

export async function getSession(): Promise<ApiSession> {
  try {
    return await auth.api.getSession({ headers: await headers() });
  } catch {
    return null;
  }
}

export async function requireSession() {
  const session = await getSession();
  if (!session)
    return {
      session: null,
      error: errorResponse(401, ApiErrorCode.UNAUTHORIZED, "Sign in required"),
    };
  return { session, error: null };
}

export async function requireAdmin() {
  const session = await getSession();
  if (!session)
    return {
      session: null,
      error: errorResponse(401, ApiErrorCode.UNAUTHORIZED, "Sign in required"),
    };
  if (session.user?.role !== "admin") {
    return {
      session: null,
      error: errorResponse(403, ApiErrorCode.FORBIDDEN, "Admin access required"),
    };
  }
  return { session, error: null };
}

export async function parseBody<T>(
  request: NextRequest,
  schema: ZodType<T>
): Promise<{ data: T; error: null } | { data: null; error: NextResponse }> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return {
      data: null,
      error: errorResponse(400, ApiErrorCode.INVALID_JSON, "Invalid JSON body"),
    };
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

export async function parseFormData<T>(
  request: NextRequest,
  schema: ZodType<T>
): Promise<
  | { data: T; formData: FormData; error: null }
  | { data: null; formData: null; error: NextResponse }
> {
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return {
      data: null,
      formData: null,
      error: errorResponse(
        400,
        ApiErrorCode.INVALID_FORM_DATA,
        "Invalid form data"
      ),
    };
  }
  const obj: Record<string, unknown> = {};
  for (const [key, value] of formData.entries()) {
    if (value instanceof File) continue;
    if (key === "photoMetadata" && typeof value === "string" && value.length > 0) {
      try {
        obj[key] = JSON.parse(value);
      } catch {
        return {
          data: null,
          formData: null,
          error: errorResponse(
            400,
            ApiErrorCode.INVALID_PHOTO_METADATA,
            "Invalid photoMetadata"
          ),
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

function zodErrorResponse(err: ZodError) {
  return errorResponse(400, ApiErrorCode.VALIDATION_FAILED, "Validation failed", {
    issues: err.issues.map((i) => ({
      path: i.path.join("."),
      message: i.message,
    })),
  });
}

export function enforceRateLimit(
  request: NextRequest,
  scope: string,
  limits: Omit<RateLimitOptions, "key">,
  userId?: string | null
): NextResponse | null {
  const result = rateLimit({
    key: buildRateKey(scope, request, userId ?? null),
    ...limits,
  });
  if (result.allowed) return null;
  const retryAfter = Math.ceil((result.resetAt - Date.now()) / 1000);
  return NextResponse.json(
    {
      message: "Too many requests",
      code: ApiErrorCode.RATE_LIMITED,
      status: 429,
    },
    {
      status: 429,
      headers: {
        "Retry-After": String(Math.max(1, retryAfter)),
        "X-RateLimit-Remaining": String(result.remaining),
      },
    }
  );
}

// Native mobile apps don't have a real web origin. They send a custom-scheme
// Origin header (e.g. "opinionmobile://") which is matched against this list
// verbatim — URL parsing would yield an empty host.
const ALLOWED_NATIVE_ORIGINS = new Set<string>(["opinionmobile://"]);

export function checkCsrfOrigin(request: NextRequest): NextResponse | null {
  const method = request.method.toUpperCase();
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") return null;

  const authHeader = request.headers.get("authorization");
  if (authHeader?.toLowerCase().startsWith("bearer ")) return null;

  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer");
  const host = request.headers.get("host");
  if (!host)
    return errorResponse(400, ApiErrorCode.CSRF_MISSING_HOST, "Missing host");

  const source = origin || referer;
  if (!source)
    return errorResponse(403, ApiErrorCode.CSRF_MISSING_ORIGIN, "Missing origin");

  if (ALLOWED_NATIVE_ORIGINS.has(source)) return null;

  const allowedHosts = new Set<string>([host]);
  const envUrl = process.env.BETTER_AUTH_URL;
  if (envUrl) {
    try {
      allowedHosts.add(new URL(envUrl).host);
    } catch {
      /* ignore */
    }
  }

  try {
    const sourceHost = new URL(source).host;
    if (!allowedHosts.has(sourceHost)) {
      return errorResponse(
        403,
        ApiErrorCode.CSRF_INVALID_ORIGIN,
        "Invalid origin"
      );
    }
  } catch {
    return errorResponse(
      403,
      ApiErrorCode.CSRF_INVALID_ORIGIN,
      "Invalid origin"
    );
  }
  return null;
}
