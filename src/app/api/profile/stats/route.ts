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

    const rl = enforceRateLimit(request, "profile:stats", RATE_LIMITS.read, session.user.id);
    if (rl) return rl;

    const result = await userService.getUserStatsWithPerformanceInfo(session.user.id);
    return json(result);
  } catch (error) {
    console.error("Profile stats error:", error);
    return errorResponse(500, "Failed to get stats");
  }
}
