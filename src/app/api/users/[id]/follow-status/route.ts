import { NextRequest } from "next/server";
import {
  enforceRateLimit,
  handleRouteError,
  json,
  parseParams,
  requireSession,
} from "@/server/http/api-helpers";
import { RATE_LIMITS } from "@/server/http/rate-limit";
import { idParamSchema } from "@/lib/validation/user-schemas";
import { isFollowing } from "@/server/services/users";
import type { FollowStatusResponse } from "@/types/userTypes";

/** GET /api/users/:id/follow-status → { is_following } */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { session, error } = await requireSession();
    if (error) return error;
    const rl = enforceRateLimit(request, "users:follow-status", RATE_LIMITS.read, session.user.id);
    if (rl) return rl;
    const p = parseParams(await params, idParamSchema);
    if (p.error) return p.error;

    const body: FollowStatusResponse = {
      is_following: await isFollowing(session.user.id, p.data.id),
    };
    return json(body);
  } catch (error) {
    return handleRouteError(error, "GET /api/users/:id/follow-status");
  }
}
