import type { NextRequest } from "next/server";
import {
  checkCsrfOrigin,
  enforceRateLimit,
  handleRouteError,
  noContent,
  parseParams,
  requireSession,
} from "@/server/http/api-helpers";
import { RATE_LIMITS } from "@/server/http/rate-limit";
import { communityMemberParamSchema } from "@/lib/validation/schemas";
import { removeCommunityMember } from "@/server/services/communities";

/**
 * DELETE /api/communities/:id/members/:userId → 204. The founder removes a
 * member; `userId` = yourself leaves (not allowed for the founder).
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  try {
    const csrf = checkCsrfOrigin(request);
    if (csrf) return csrf;
    const { session, error } = await requireSession();
    if (error) return error;
    const rl = enforceRateLimit(request, "communities:remove", RATE_LIMITS.write, session.user.id);
    if (rl) return rl;
    const p = parseParams(await params, communityMemberParamSchema);
    if (p.error) return p.error;
    await removeCommunityMember(p.data.id, session.user.id, p.data.userId);
    return noContent();
  } catch (error) {
    return handleRouteError(error, "DELETE /api/communities/:id/members/:userId");
  }
}
