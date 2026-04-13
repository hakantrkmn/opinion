import { NextRequest } from "next/server";
import { userService } from "@/lib/services/userService";
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

    const rl = enforceRateLimit(
      request,
      "users:pins",
      RATE_LIMITS.read,
      session.user.id
    );
    if (rl) return rl;

    const parsed = idParamSchema.safeParse(await params);
    if (!parsed.success)
      return errorResponse(400, ApiErrorCode.BAD_REQUEST, "Invalid id");

    const { pins, error } = await userService.getUserPins(parsed.data.id);
    if (error) return errorResponse(500, ApiErrorCode.INTERNAL_ERROR, error);
    return json({ pins });
  } catch (error) {
    console.error("Public user pins error:", error);
    return errorResponse(500, ApiErrorCode.INTERNAL_ERROR, "Failed to get pins");
  }
}
