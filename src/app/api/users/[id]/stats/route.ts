import { NextRequest } from "next/server";
import {
  enforceRateLimit,
  errors,
  handleRouteError,
  json,
  parseParams,
  requireSession,
} from "@/server/http/api-helpers";
import { RATE_LIMITS } from "@/server/http/rate-limit";
import { idParamSchema } from "@/lib/validation/user-schemas";
import { isBlockedRelation } from "@/server/services/blocks";
import { assertActiveUser, getUserStats } from "@/server/services/users";
import type { UserStatsResponse } from "@/types/userTypes";

/** GET /api/users/:id/stats → { stats } */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { session, error } = await requireSession();
    if (error) return error;
    const rl = enforceRateLimit(request, "users:stats", RATE_LIMITS.read, session.user.id);
    if (rl) return rl;
    const p = parseParams(await params, idParamSchema);
    if (p.error) return p.error;

    if (await isBlockedRelation(session.user.id, p.data.id)) {
      return errors.notFound("User not found");
    }
    await assertActiveUser(p.data.id);
    const body: UserStatsResponse = { stats: await getUserStats(p.data.id) };
    return json(body);
  } catch (error) {
    return handleRouteError(error, "GET /api/users/:id/stats");
  }
}
