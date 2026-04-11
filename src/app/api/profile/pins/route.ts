import { NextRequest } from "next/server";
import { userService } from "@/lib/services/userService";
import {
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

    const rl = enforceRateLimit(request, "profile:pins", RATE_LIMITS.read, session.user.id);
    if (rl) return rl;

    const { pins, error } = await userService.getUserPins(session.user.id);
    if (error) return errorResponse(500, error);
    return json({ pins });
  } catch (error) {
    console.error("Profile pins error:", error);
    return errorResponse(500, "Failed");
  }
}
