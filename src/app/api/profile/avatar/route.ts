import { NextRequest } from "next/server";
import {
  checkCsrfOrigin,
  enforceRateLimit,
  handleRouteError,
  noContent,
  requireSession,
} from "@/server/http/api-helpers";
import { RATE_LIMITS } from "@/server/http/rate-limit";
import { deleteAvatar } from "@/server/services/users";

/**
 * DELETE /api/profile/avatar → 204. (Set an avatar with
 * POST /api/upload, type=avatar.)
 */
export async function DELETE(request: NextRequest) {
  try {
    const csrf = checkCsrfOrigin(request);
    if (csrf) return csrf;
    const { session, error } = await requireSession();
    if (error) return error;
    const rl = enforceRateLimit(request, "profile:avatar", RATE_LIMITS.write, session.user.id);
    if (rl) return rl;

    await deleteAvatar(session.user.id);
    return noContent();
  } catch (error) {
    return handleRouteError(error, "DELETE /api/profile/avatar");
  }
}
