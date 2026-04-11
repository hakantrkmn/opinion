import { LRUCache } from "lru-cache";
import type { NextRequest } from "next/server";

type Bucket = { count: number; resetAt: number };

const buckets = new LRUCache<string, Bucket>({
  max: 10_000,
  ttl: 10 * 60 * 1000,
});

export type RateLimitOptions = {
  key: string;
  limit: number;
  windowMs: number;
};

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  resetAt: number;
};

export function rateLimit(opts: RateLimitOptions): RateLimitResult {
  const now = Date.now();
  const existing = buckets.get(opts.key);

  if (!existing || existing.resetAt <= now) {
    const bucket: Bucket = { count: 1, resetAt: now + opts.windowMs };
    buckets.set(opts.key, bucket);
    return { allowed: true, remaining: opts.limit - 1, resetAt: bucket.resetAt };
  }

  existing.count += 1;
  buckets.set(opts.key, existing);
  const allowed = existing.count <= opts.limit;
  return {
    allowed,
    remaining: Math.max(0, opts.limit - existing.count),
    resetAt: existing.resetAt,
  };
}

export function getClientIp(request: NextRequest | Request): string {
  const h =
    "headers" in request && typeof request.headers.get === "function"
      ? request.headers
      : null;
  if (!h) return "unknown";
  const xff = h.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return (
    h.get("x-real-ip") ||
    h.get("cf-connecting-ip") ||
    h.get("x-vercel-forwarded-for") ||
    "unknown"
  );
}

export function buildRateKey(
  scope: string,
  request: NextRequest | Request,
  userId?: string | null
): string {
  const principal = userId ? `u:${userId}` : `ip:${getClientIp(request)}`;
  return `${scope}:${principal}`;
}

export const RATE_LIMITS = {
  read: { limit: 120, windowMs: 60_000 },
  write: { limit: 30, windowMs: 60_000 },
  upload: { limit: 15, windowMs: 60_000 },
  vote: { limit: 60, windowMs: 60_000 },
  admin: { limit: 120, windowMs: 60_000 },
  auth: { limit: 10, windowMs: 60_000 },
} as const;
