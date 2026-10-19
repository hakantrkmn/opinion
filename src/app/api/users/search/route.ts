import { NextRequest } from "next/server";
import {
  enforceRateLimit,
  handleRouteError,
  json,
  parseQuery,
  requireSession,
} from "@/server/http/api-helpers";
import { RATE_LIMITS } from "@/server/http/rate-limit";
import { userSearchQuerySchema } from "@/lib/validation/user-schemas";
import { searchUsers } from "@/server/services/users";

/**
 * GET /api/users/search?q=&limit=&offset= → Paginated<UserSummary>
 * q must be 2–50 chars. Excludes the viewer, deleted and blocked users.
 */
export async function GET(request: NextRequest) {
  try {
    const { session, error } = await requireSession();
    if (error) return error;
    const rl = enforceRateLimit(request, "users:search", RATE_LIMITS.read, session.user.id);
    if (rl) return rl;
    const q = parseQuery(request, userSearchQuerySchema);
    if (q.error) return q.error;

    const { q: query, limit, offset } = q.data;
    return json(await searchUsers(query, session.user.id, { limit, offset }));
  } catch (error) {
    return handleRouteError(error, "GET /api/users/search");
  }
}
