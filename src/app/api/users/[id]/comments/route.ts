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
import { isBlockedRelation } from "@/lib/blocked-users";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { session, error: authError } = await requireSession();
    if (authError) return authError;

    const rl = enforceRateLimit(
      request,
      "users:comments",
      RATE_LIMITS.read,
      session.user.id
    );
    if (rl) return rl;

    const parsed = idParamSchema.safeParse(await params);
    if (!parsed.success)
      return errorResponse(400, ApiErrorCode.BAD_REQUEST, "Invalid id");

    const blocked = await isBlockedRelation(session.user.id, parsed.data.id);
    if (blocked) {
      return errorResponse(404, ApiErrorCode.NOT_FOUND, "User not found");
    }

    const { comments, error } = await userService.getUserComments(
      parsed.data.id
    );
    if (error) return errorResponse(500, ApiErrorCode.INTERNAL_ERROR, error);
    return json({ comments });
  } catch (error) {
    console.error("Public user comments error:", error);
    return errorResponse(500, ApiErrorCode.INTERNAL_ERROR, "Failed to get comments");
  }
}
