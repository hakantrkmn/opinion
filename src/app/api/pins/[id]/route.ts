import { NextRequest } from "next/server";
import { pinService } from "@/lib/services/pinService";
import {
  ApiErrorCode,
  errorResponse,
  json,
  requireSession,
  enforceRateLimit,
  checkCsrfOrigin,
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

    const rl = enforceRateLimit(request, "pins:delete", RATE_LIMITS.write, session.user.id);
    if (rl) return rl;

    const parsed = idParamSchema.safeParse(await params);
    if (!parsed.success) return errorResponse(400, ApiErrorCode.BAD_REQUEST, "Invalid id");

    const { success, error } = await pinService.deletePin(parsed.data.id, session.user.id);
    if (error) return errorResponse(400, ApiErrorCode.BAD_REQUEST, error);
    return json({ success });
  } catch (error) {
    console.error("Pin DELETE error:", error);
    return errorResponse(500, ApiErrorCode.INTERNAL_ERROR, "Failed to delete pin");
  }
}
