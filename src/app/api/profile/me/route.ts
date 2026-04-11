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

    const rl = enforceRateLimit(request, "profile:me", RATE_LIMITS.read, session.user.id);
    if (rl) return rl;

    const { profile, error } = await userService.getUserProfile(session.user.id);
    if (error) return errorResponse(500, ApiErrorCode.INTERNAL_ERROR, error);
    return json({ profile });
  } catch (error) {
    console.error("Profile me error:", error);
    return errorResponse(500, ApiErrorCode.INTERNAL_ERROR, "Failed to get profile");
  }
}
