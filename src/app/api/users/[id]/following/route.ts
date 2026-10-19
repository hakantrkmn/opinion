import { NextRequest } from "next/server";
import {
  enforceRateLimit,
  errors,
  handleRouteError,
  json,
  parseParams,
  parseQuery,
  requireSession,
} from "@/server/http/api-helpers";
import { RATE_LIMITS } from "@/server/http/rate-limit";
import { offsetPaginationSchema } from "@/server/http/pagination";
import { idParamSchema } from "@/lib/validation/user-schemas";
import { isBlockedRelation } from "@/server/services/blocks";
import { assertActiveUser, getFollowing } from "@/server/services/users";

/** GET /api/users/:id/following?limit&offset → Paginated<FollowListUser> (blocked and deleted users omitted) */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { session, error } = await requireSession();
    if (error) return error;
    const rl = enforceRateLimit(request, "users:following", RATE_LIMITS.read, session.user.id);
    if (rl) return rl;
    const p = parseParams(await params, idParamSchema);
    if (p.error) return p.error;
    const q = parseQuery(request, offsetPaginationSchema());
    if (q.error) return q.error;

    if (await isBlockedRelation(session.user.id, p.data.id)) {
      return errors.notFound("User not found");
    }
    await assertActiveUser(p.data.id);
    return json(await getFollowing(p.data.id, session.user.id, q.data));
  } catch (error) {
    return handleRouteError(error, "GET /api/users/:id/following");
  }
}
