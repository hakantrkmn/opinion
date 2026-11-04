import type { NextRequest } from "next/server";
import {
  checkCsrfOrigin,
  enforceRateLimit,
  handleRouteError,
  json,
  parseBody,
  parseParams,
  requireSession,
} from "@/server/http/api-helpers";
import { RATE_LIMITS } from "@/server/http/rate-limit";
import { deviceFixOf, idParamSchema, updateCommentSchema } from "@/lib/validation/schemas";
import { deleteComment, updateComment } from "@/server/services/pins";
import type { CommentResponse, DeleteCommentResponse } from "@/types/api";

type Ctx = { params: Promise<{ id: string }> };

/**
 * PATCH /api/comments/:id (JSON { text?, photo_url? | null, user_lat?,
 * user_lng?, accuracy? }) → { comment }. The device fix marks it "Was here"
 * (422 TOO_FAR with { distance_m, max_distance_m } when too far).
 * 404 when the comment does not exist or is not the caller's.
 */
export async function PATCH(request: NextRequest, { params }: Ctx) {
  try {
    const csrf = checkCsrfOrigin(request);
    if (csrf) return csrf;

    const { session, error: authError } = await requireSession();
    if (authError) return authError;

    const rl = enforceRateLimit(request, "comments:update", RATE_LIMITS.write, session.user.id);
    if (rl) return rl;

    const p = parseParams(await params, idParamSchema);
    if (p.error) return p.error;
    const body = await parseBody(request, updateCommentSchema);
    if (body.error) return body.error;

    const result: CommentResponse = {
      comment: await updateComment({
        commentId: p.data.id,
        userId: session.user.id,
        text: body.data.text,
        photoUrl: body.data.photo_url,
        device: deviceFixOf(body.data),
      }),
    };
    return json(result);
  } catch (error) {
    return handleRouteError(error, "PATCH /api/comments/:id");
  }
}

/**
 * DELETE /api/comments/:id → { pin_deleted, pin_id }
 * 404 when the comment does not exist or is not the caller's.
 */
export async function DELETE(request: NextRequest, { params }: Ctx) {
  try {
    const csrf = checkCsrfOrigin(request);
    if (csrf) return csrf;

    const { session, error: authError } = await requireSession();
    if (authError) return authError;

    const rl = enforceRateLimit(request, "comments:delete", RATE_LIMITS.write, session.user.id);
    if (rl) return rl;

    const p = parseParams(await params, idParamSchema);
    if (p.error) return p.error;

    const result: DeleteCommentResponse = await deleteComment({
      commentId: p.data.id,
      userId: session.user.id,
    });
    return json(result);
  } catch (error) {
    return handleRouteError(error, "DELETE /api/comments/:id");
  }
}
