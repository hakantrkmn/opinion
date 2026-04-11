import { NextRequest, NextResponse } from "next/server";
import { pinService } from "@/lib/services/pinService";
import {
  requireSession,
  enforceRateLimit,
  checkCsrfOrigin,
  errorResponse,
  ApiErrorCode,
} from "@/lib/api-helpers";
import { idParamSchema } from "@/lib/validation/schemas";
import { RATE_LIMITS } from "@/lib/rate-limit";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const csrf = checkCsrfOrigin(request);
    if (csrf) return csrf;

    const { session, error: authError } = await requireSession();
    if (authError) return authError;

    const rl = enforceRateLimit(request, "comment:cleanup", RATE_LIMITS.write, session.user.id);
    if (rl) return rl;

    const parsed = idParamSchema.safeParse(await params);
    if (!parsed.success) {
      return errorResponse(400, ApiErrorCode.BAD_REQUEST, "Invalid id");
    }

    const result = await pinService.deleteCommentWithCleanup(parsed.data.id, session.user.id);
    if (result.error) return errorResponse(400, ApiErrorCode.BAD_REQUEST, result.error);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Comment cleanup DELETE error:", error);
    return errorResponse(500, ApiErrorCode.INTERNAL_ERROR, "Failed to delete comment");
  }
}
