import { NextRequest } from "next/server";
import { userService } from "@/lib/services/userService";
import {
  ApiErrorCode,
  errorResponse,
  json,
  requireSession,
  enforceRateLimit,
  checkCsrfOrigin,
} from "@/lib/api-helpers";
import { RATE_LIMITS } from "@/lib/rate-limit";

export async function DELETE(request: NextRequest) {
  try {
    const csrf = checkCsrfOrigin(request);
    if (csrf) return csrf;

    const { session, error: authError } = await requireSession();
    if (authError) return authError;

    const rl = enforceRateLimit(
      request,
      "account:delete",
      RATE_LIMITS.write,
      session.user.id
    );
    if (rl) return rl;

    const result = await userService.deleteAccount(session.user.id);
    if (!result.success) {
      return errorResponse(
        500,
        ApiErrorCode.INTERNAL_ERROR,
        result.error || "Failed to delete account"
      );
    }

    return json({ success: true });
  } catch (error) {
    console.error("Account delete error:", error);
    return errorResponse(
      500,
      ApiErrorCode.INTERNAL_ERROR,
      "Failed to delete account"
    );
  }
}
