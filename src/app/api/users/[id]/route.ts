import { NextRequest } from "next/server";
import {
  enforceRateLimit,
  handleRouteError,
  json,
  parseParams,
  requireSession,
  errors,
} from "@/server/http/api-helpers";
import { RATE_LIMITS } from "@/server/http/rate-limit";
import { idParamSchema } from "@/lib/validation/user-schemas";
import { hasBlocked, isBlockedRelation } from "@/server/services/blocks";
import {
  getPublicProfile,
  getUserStats,
  isFollowing,
} from "@/server/services/users";
import type { PublicUserResponse } from "@/types/userTypes";

/** GET /api/users/:id → PublicUserResponse (404 if deleted or blocked by them). */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { session, error } = await requireSession();
    if (error) return error;
    const rl = enforceRateLimit(request, "users:profile", RATE_LIMITS.read, session.user.id);
    if (rl) return rl;
    const p = parseParams(await params, idParamSchema);
    if (p.error) return p.error;

    const viewerId = session.user.id;
    const targetId = p.data.id;
    const isSelf = viewerId === targetId;

    const [blockedByMe, blockedEitherWay] = isSelf
      ? [false, false]
      : await Promise.all([
          hasBlocked(viewerId, targetId),
          isBlockedRelation(viewerId, targetId),
        ]);
    // Users who blocked the viewer are invisible to them. Users the viewer
    // blocked stay reachable so they can be unblocked from the profile.
    if (blockedEitherWay && !blockedByMe) return errors.notFound("User not found");

    const [user, stats, following] = await Promise.all([
      getPublicProfile(targetId),
      getUserStats(targetId),
      isSelf ? Promise.resolve(false) : isFollowing(viewerId, targetId),
    ]);

    const body: PublicUserResponse = {
      user,
      stats,
      viewer: { is_self: isSelf, is_following: following, is_blocked: blockedByMe },
    };
    return json(body);
  } catch (error) {
    return handleRouteError(error, "GET /api/users/:id");
  }
}
