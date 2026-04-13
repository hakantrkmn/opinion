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

    const rl = enforceRateLimit(
      request,
      "users:search",
      RATE_LIMITS.read,
      session.user.id
    );
    if (rl) return rl;

    const { searchParams } = new URL(request.url);
    const q = (searchParams.get("q") ?? "").trim();
    const limit = Number(searchParams.get("limit") ?? "20");
    const offset = Number(searchParams.get("offset") ?? "0");

    if (q.length < 2) {
      return json({ users: [] });
    }

    const { users, error } = await userService.searchUsersByDisplayName(
      q,
      Number.isFinite(limit) ? limit : 20,
      Number.isFinite(offset) ? offset : 0
    );
    if (error) return errorResponse(500, ApiErrorCode.INTERNAL_ERROR, error);
    return json({ users });
  } catch (error) {
    console.error("Users search error:", error);
    return errorResponse(500, ApiErrorCode.INTERNAL_ERROR, "Failed to search");
  }
}
