import type { NextRequest } from "next/server";
import {
  enforceRateLimit,
  getSession,
  handleRouteError,
  json,
  parseQuery,
} from "@/server/http/api-helpers";
import { RATE_LIMITS } from "@/server/http/rate-limit";
import { pinClustersQuerySchema } from "@/lib/validation/schemas";
import { getPinClusters, mapCacheHeaders } from "@/server/services/pins";
import type { PinClustersResponse } from "@/types/api";

/**
 * GET /api/pins/clusters?minLat&maxLat&minLng&maxLng&zoom&scope
 * → PinClustersResponse. `zoom` is clamped to [0, PIN_DETAIL_MIN_ZOOM - 1].
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    const viewerId = session?.user.id ?? null;

    const rl = enforceRateLimit(request, "pins:clusters", RATE_LIMITS.map, viewerId);
    if (rl) return rl;

    const q = parseQuery(request, pinClustersQuerySchema);
    if (q.error) return q.error;

    const body: PinClustersResponse = await getPinClusters({
      bounds: q.data,
      scope: q.data.scope,
      zoom: q.data.zoom,
      viewerId,
    });
    return json(body, { headers: mapCacheHeaders(viewerId, q.data.scope) });
  } catch (error) {
    return handleRouteError(error, "GET /api/pins/clusters");
  }
}
