import { NextRequest } from "next/server";
import { userService } from "@/lib/services/userService";
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

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const csrf = checkCsrfOrigin(request);
    if (csrf) return csrf;

    const { session, error: authError } = await requireSession();
    if (authError) return authError;

    const rl = enforceRateLimit(
      request,
      "users:follow",
      RATE_LIMITS.write,
      session.user.id
    );
    if (rl) return rl;

    const parsed = idParamSchema.safeParse(await params);
    if (!parsed.success) {
      return errorResponse(400, ApiErrorCode.BAD_REQUEST, "Invalid id");
    }

    const result = await userService.followUser(session.user.id, parsed.data.id);
    if (!result.success) {
      return errorResponse(
        result.error === "User not found" ? 404 : 400,
        result.error === "User not found"
          ? ApiErrorCode.NOT_FOUND
          : ApiErrorCode.BAD_REQUEST,
        result.error ?? "Failed to follow user"
      );
    }

    return json({ success: true, isFollowing: true });
  } catch (error) {
    console.error("Follow POST error:", error);
    return errorResponse(
      500,
      ApiErrorCode.INTERNAL_ERROR,
      "Failed to follow user"
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const csrf = checkCsrfOrigin(request);
    if (csrf) return csrf;

    const { session, error: authError } = await requireSession();
    if (authError) return authError;

    const rl = enforceRateLimit(
      request,
      "users:unfollow",
      RATE_LIMITS.write,
      session.user.id
    );
    if (rl) return rl;

    const parsed = idParamSchema.safeParse(await params);
    if (!parsed.success) {
      return errorResponse(400, ApiErrorCode.BAD_REQUEST, "Invalid id");
    }

    const result = await userService.unfollowUser(
      session.user.id,
      parsed.data.id
    );
    if (!result.success) {
      return errorResponse(
        result.error === "User not found" ? 404 : 400,
        result.error === "User not found"
          ? ApiErrorCode.NOT_FOUND
          : ApiErrorCode.BAD_REQUEST,
        result.error ?? "Failed to unfollow user"
      );
    }

    return json({ success: true, isFollowing: false });
  } catch (error) {
    console.error("Follow DELETE error:", error);
    return errorResponse(
      500,
      ApiErrorCode.INTERNAL_ERROR,
      "Failed to unfollow user"
    );
  }
}
