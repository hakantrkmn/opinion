import { NextRequest } from "next/server";
import { pinService } from "@/lib/services/pinService";
import {
  ApiErrorCode,
  errorResponse,
  json,
  requireSession,
  parseBody,
  enforceRateLimit,
  checkCsrfOrigin,
} from "@/lib/api-helpers";
import { idParamSchema, updateCommentSchema } from "@/lib/validation/schemas";
import { RATE_LIMITS } from "@/lib/rate-limit";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const csrf = checkCsrfOrigin(request);
    if (csrf) return csrf;

    const { session, error: authError } = await requireSession();
    if (authError) return authError;

    const rl = enforceRateLimit(request, "comment:put", RATE_LIMITS.write, session.user.id);
    if (rl) return rl;

    const paramParsed = idParamSchema.safeParse(await params);
    if (!paramParsed.success) return errorResponse(400, ApiErrorCode.BAD_REQUEST, "Invalid id");

    const body = await parseBody(request, updateCommentSchema);
    if (body.error) return body.error;

    const { success, error } = await pinService.updateComment(
      paramParsed.data.id,
      body.data.text,
      session.user.id,
      body.data.photoUrl ?? undefined,
      body.data.photoMetadata ?? undefined
    );
    if (error) return errorResponse(400, ApiErrorCode.BAD_REQUEST, error);
    return json({ success });
  } catch (error) {
    console.error("Comment PUT error:", error);
    return errorResponse(500, ApiErrorCode.INTERNAL_ERROR, "Failed to update comment");
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

    const rl = enforceRateLimit(request, "comment:delete", RATE_LIMITS.write, session.user.id);
    if (rl) return rl;

    const parsed = idParamSchema.safeParse(await params);
    if (!parsed.success) return errorResponse(400, ApiErrorCode.BAD_REQUEST, "Invalid id");

    const { success, error } = await pinService.deleteComment(parsed.data.id, session.user.id);
    if (error) return errorResponse(400, ApiErrorCode.BAD_REQUEST, error);
    return json({ success });
  } catch (error) {
    console.error("Comment DELETE error:", error);
    return errorResponse(500, ApiErrorCode.INTERNAL_ERROR, "Failed to delete comment");
  }
}
