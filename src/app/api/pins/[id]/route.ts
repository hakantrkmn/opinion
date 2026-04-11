import { NextRequest } from "next/server";
import { pinService } from "@/lib/services/pinService";
import {
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
    if (!parsed.success) return errorResponse(400, "Invalid id");

    const { success, error } = await pinService.deletePin(parsed.data.id, session.user.id);
    if (error) return errorResponse(400, error);
    return json({ success });
  } catch (error) {
    console.error("Pin DELETE error:", error);
    return errorResponse(500, "Failed to delete pin");
  }
}
