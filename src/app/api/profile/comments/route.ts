import { NextRequest } from "next/server";
import { userService } from "@/lib/services/userService";
import {
  ApiErrorCode,
  errorResponse,
  json,
  requireSession,
  enforceRateLimit,
} from "@/lib/api-helpers";
import { RATE_LIMITS } from "@/lib/rate-limit";

export async function GET(request: NextRequest) {
  try {
    const { session, error: authError } = await requireSession();
    if (authError) return authError;

    const rl = enforceRateLimit(request, "profile:comments", RATE_LIMITS.read, session.user.id);
    if (rl) return rl;

    const { comments, error } = await userService.getUserComments(session.user.id);
    if (error) return errorResponse(500, ApiErrorCode.INTERNAL_ERROR, error);
    return json({ comments });
  } catch (error) {
    console.error("Profile comments error:", error);
    return errorResponse(500, ApiErrorCode.INTERNAL_ERROR, "Failed to get comments");
  }
}
