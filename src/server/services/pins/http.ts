import "server-only";
import type { PinScope } from "@/types/api";

/**
 * Cache headers for the map endpoints. Anonymous `scope=all` responses are
 * identical for everyone, so shared caches may keep them briefly; anything
 * viewer-specific (blocks, following) must never be shared.
 */
export function mapCacheHeaders(viewerId: string | null, scope: PinScope): HeadersInit {
  if (!viewerId && scope === "all") {
    return {
      "Cache-Control": "public, max-age=30, stale-while-revalidate=30",
      Vary: "Cookie, Authorization",
    };
  }
  return { "Cache-Control": "private, no-store", Vary: "Cookie, Authorization" };
}
