import { after, type NextRequest } from "next/server";
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
import { idParamSchema, voteCommentSchema } from "@/lib/validation/schemas";
import { notifyCommentLiked, voteComment } from "@/server/services/pins";
import type { VoteResponse } from "@/types/api";

type Ctx = { params: Promise<{ id: string }> };

/**
 * PUT /api/comments/:id/vote (JSON { value: -1 | 0 | 1 }) → VoteResponse
 * 0 removes the vote. 404 unknown comment, 403 block relation with author.
 */
export async function PUT(request: NextRequest, { params }: Ctx) {
  try {
    const csrf = checkCsrfOrigin(request);
    if (csrf) return csrf;

    const { session, error: authError } = await requireSession();
    if (authError) return authError;
    const userId = session.user.id;

    const rl = enforceRateLimit(request, "comments:vote", RATE_LIMITS.vote, userId);
    if (rl) return rl;

    const p = parseParams(await params, idParamSchema);
    if (p.error) return p.error;
    const body = await parseBody(request, voteCommentSchema);
    if (body.error) return body.error;

    const result = await voteComment({
      commentId: p.data.id,
      userId,
      value: body.data.value,
    });

    if (result.became_like && result.author_id !== userId) {
      after(() => notifyCommentLiked({ commentId: p.data.id, likerId: userId }));
    }

    const response: VoteResponse = {
      likes: result.likes,
      dislikes: result.dislikes,
      my_vote: result.my_vote,
    };
    return json(response);
  } catch (error) {
    return handleRouteError(error, "PUT /api/comments/:id/vote");
  }
}
