import { NextRequest } from "next/server";
import { userService } from "@/lib/services/userService";
import {
  errorResponse,
  json,
  requireSession,
  parseBody,
  enforceRateLimit,
  checkCsrfOrigin,
} from "@/lib/api-helpers";
import { updateProfileSchema } from "@/lib/validation/schemas";
import { RATE_LIMITS } from "@/lib/rate-limit";

export async function PUT(request: NextRequest) {
  try {
    const csrf = checkCsrfOrigin(request);
    if (csrf) return csrf;

    const { session, error: authError } = await requireSession();
    if (authError) return authError;

    const rl = enforceRateLimit(request, "profile:put", RATE_LIMITS.write, session.user.id);
    if (rl) return rl;

    const body = await parseBody(request, updateProfileSchema);
    if (body.error) return body.error;

    if (body.data.displayName !== undefined) {
      const result = await userService.updateDisplayName(session.user.id, body.data.displayName);
      if (!result.success) return errorResponse(400, result.error || "Failed to update");
    }
    return json({ success: true });
  } catch (error) {
    console.error("Profile update error:", error);
    return errorResponse(500, "Failed to update profile");
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const csrf = checkCsrfOrigin(request);
    if (csrf) return csrf;

    const { session, error: authError } = await requireSession();
    if (authError) return authError;

    const rl = enforceRateLimit(request, "profile:delete", RATE_LIMITS.write, session.user.id);
    if (rl) return rl;

    const result = await userService.deleteAvatar(session.user.id);
    if (!result.success) return errorResponse(400, result.error || "Failed");
    return json({ success: true });
  } catch (error) {
    console.error("Avatar delete error:", error);
    return errorResponse(500, "Failed to delete avatar");
  }
}
