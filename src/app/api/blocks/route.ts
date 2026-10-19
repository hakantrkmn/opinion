import { NextRequest } from "next/server";
import {
  enforceRateLimit,
  handleRouteError,
  json,
  parseQuery,
  requireSession,
} from "@/server/http/api-helpers";
import { RATE_LIMITS } from "@/server/http/rate-limit";
import { offsetPaginationSchema } from "@/server/http/pagination";
import { listBlockedUsers } from "@/server/services/blocks";

/**
 * GET /api/blocks?limit&offset → Paginated<BlockedUser> (users I blocked).
 * Block / unblock: POST|DELETE /api/users/:id/block.
 */
export async function GET(request: NextRequest) {
  try {
    const { session, error } = await requireSession();
    if (error) return error;
    const rl = enforceRateLimit(request, "blocks:list", RATE_LIMITS.read, session.user.id);
    if (rl) return rl;
    const q = parseQuery(request, offsetPaginationSchema(20, 50));
    if (q.error) return q.error;

    return json(await listBlockedUsers(session.user.id, q.data));
  } catch (error) {
    return handleRouteError(error, "GET /api/blocks");
  }
}
