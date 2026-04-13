import { NextRequest } from "next/server";
import { userService } from "@/lib/services/userService";
import {
  ApiErrorCode,
  errorResponse,
  json,
  requireSession,
  enforceRateLimit,
} from "@/lib/api-helpers";
import { idParamSchema, paginationSchema } from "@/lib/validation/schemas";
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
      "users:following",
      RATE_LIMITS.read,
      session.user.id
    );
    if (rl) return rl;

    const parsedId = idParamSchema.safeParse(await params);
    if (!parsedId.success) {
      return errorResponse(400, ApiErrorCode.BAD_REQUEST, "Invalid id");
    }

    const searchParams = Object.fromEntries(new URL(request.url).searchParams);
    const parsedPagination = paginationSchema.safeParse(searchParams);
    if (!parsedPagination.success) {
      return errorResponse(
        400,
        ApiErrorCode.VALIDATION_FAILED,
        "Validation failed",
        {
          issues: parsedPagination.error.issues.map((issue) => ({
            path: issue.path.join("."),
            message: issue.message,
          })),
        }
      );
    }

    const result = await userService.getFollowing(parsedId.data.id, {
      page: parsedPagination.data.page,
      pageSize: parsedPagination.data.pageSize,
    });

    if (result.error === "User not found") {
      return errorResponse(404, ApiErrorCode.NOT_FOUND, result.error);
    }

    if (result.error) {
      return errorResponse(400, ApiErrorCode.BAD_REQUEST, result.error);
    }

    return json(result);
  } catch (error) {
    console.error("Following GET error:", error);
    return errorResponse(
      500,
      ApiErrorCode.INTERNAL_ERROR,
      "Failed to load following"
    );
  }
}
