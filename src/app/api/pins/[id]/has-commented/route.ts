import { NextRequest } from "next/server";
import { pinService } from "@/lib/services/pinService";
import {
  ApiErrorCode,
  errorResponse,
  json,
  requireSession,
  enforceRateLimit,
} from "@/lib/api-helpers";
import { idParamSchema } from "@/lib/validation/schemas";
import { RATE_LIMITS } from "@/lib/rate-limit";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { session, error: authError } = await requireSession();
    if (authError) return authError;

    const rl = enforceRateLimit(request, "pin:has-commented", RATE_LIMITS.read, session.user.id);
    if (rl) return rl;

    const parsed = idParamSchema.safeParse(await params);
    if (!parsed.success) return errorResponse(400, ApiErrorCode.BAD_REQUEST, "Invalid id");

    const result = await pinService.hasUserCommented(parsed.data.id, session.user.id);
    return json(result);
  } catch (error) {
    console.error("Has commented error:", error);
    return errorResponse(500, ApiErrorCode.INTERNAL_ERROR, "Failed to check");
  }
}
