import type { NextRequest } from "next/server";
import {
  enforceRateLimit,
  getSession,
  handleRouteError,
  json,
  parseQuery,
} from "@/server/http/api-helpers";
import { RATE_LIMITS } from "@/server/http/rate-limit";
import { nearestPinQuerySchema } from "@/lib/validation/schemas";
import { getNearestPin, mapCacheHeaders } from "@/server/services/pins";
import type { NearestPinResponse } from "@/types/api";

/**
 * GET /api/pins/nearest?lat&lng → NearestPinResponse. Clients round the
 * point (the web app to ~1 km) so anonymous responses cache well.
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    const viewerId = session?.user.id ?? null;

    const rl = enforceRateLimit(request, "pins:nearest", RATE_LIMITS.read, viewerId);
    if (rl) return rl;

    const q = parseQuery(request, nearestPinQuerySchema);
    if (q.error) return q.error;

    const body: NearestPinResponse = await getNearestPin({ ...q.data, viewerId });
    return json(body, { headers: mapCacheHeaders(viewerId, "all") });
  } catch (error) {
    return handleRouteError(error, "GET /api/pins/nearest");
  }
}
