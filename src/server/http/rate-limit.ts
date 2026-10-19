import "server-only";
import { LRUCache } from "lru-cache";
import { isIP } from "net";

/**
 * In-memory fixed-window rate limiter. State lives in this Node process, so
 * limits are per instance (fine for the single-container deployment; move to
 * Redis/Postgres if the app is ever scaled horizontally).
 */

type Bucket = { count: number; resetAt: number };

const buckets = new LRUCache<string, Bucket>({
  max: 100_000,
  // Fallback TTL; every bucket is stored with its own window as TTL below.
  ttl: 60 * 60 * 1000,
  ttlAutopurge: false,
  updateAgeOnGet: false,
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
    buckets.set(opts.key, bucket, { ttl: opts.windowMs });
    return {
      allowed: opts.limit >= 1,
      remaining: Math.max(0, opts.limit - 1),
      resetAt: bucket.resetAt,
    };
  }

  // Mutate in place: keeps the original TTL/window (no sliding extension).
  existing.count += 1;
  return {
    allowed: existing.count <= opts.limit,
    remaining: Math.max(0, opts.limit - existing.count),
    resetAt: existing.resetAt,
  };
}

/**
 * Number of reverse proxies in front of the app that append to
 * X-Forwarded-For (Traefik on Dokploy = 1). The client IP is the entry that
 * the outermost trusted proxy appended, i.e. the N-th entry from the RIGHT.
 * Everything to the left of it is client-controlled and must not be trusted.
 */
function trustedProxyHops(): number {
  const raw = Number(process.env.TRUSTED_PROXY_HOPS ?? "1");
  return Number.isInteger(raw) && raw >= 0 && raw <= 10 ? raw : 1;
}

function normalizeIp(value: string | null | undefined): string | null {
  if (!value) return null;
  let ip = value.trim();
  // Strip IPv6 brackets / IPv4 port suffixes.
  if (ip.startsWith("[")) ip = ip.slice(1, ip.indexOf("]"));
  else if (/^\d+\.\d+\.\d+\.\d+:\d+$/.test(ip)) ip = ip.split(":")[0];
  if (ip.startsWith("::ffff:")) ip = ip.slice(7);
  return isIP(ip) ? ip : null;
}

/**
 * Client IP that cannot be spoofed by the client as long as
 * TRUSTED_PROXY_HOPS matches the deployment:
 *  - hops >= 1: rightmost-N X-Forwarded-For entry, falling back to
 *    X-Real-IP (set by Traefik from the TCP peer).
 *  - hops = 0: the rightmost X-Forwarded-For entry is used, which is
 *    client-controlled when nothing in front rewrites the header. Only use
 *    hops = 0 for local development; production must run behind a proxy
 *    (Traefik) that sets X-Forwarded-For / X-Real-IP.
 */
export function getClientIp(request: { headers: Headers }): string {
  const h = request.headers;
  const hops = trustedProxyHops();
  const xff = (h.get("x-forwarded-for") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  if (xff.length > 0) {
    const index = hops === 0 ? xff.length - 1 : xff.length - hops;
    const candidate = normalizeIp(xff[Math.max(0, index)]);
    if (candidate) return candidate;
  }
  return normalizeIp(h.get("x-real-ip")) ?? "unknown";
}

export function buildRateKey(
  scope: string,
  request: { headers: Headers },
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
  /** Shared by better-auth's own rate limiter config (see auth.ts). */
  auth: { limit: 10, windowMs: 60_000 },
  og: { limit: 30, windowMs: 60_000 },
  /** Map tile-ish reads (pins in bbox / clusters): panning is chatty. */
  map: { limit: 600, windowMs: 60_000 },
} as const;
