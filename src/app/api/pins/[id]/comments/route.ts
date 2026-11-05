import { after, type NextRequest } from "next/server";
import {
  checkCsrfOrigin,
  enforceRateLimit,
  getSession,
  handleRouteError,
  json,
  parseBody,
  parseParams,
  parseQuery,
  requireSession,
} from "@/server/http/api-helpers";
import { RATE_LIMITS } from "@/server/http/rate-limit";
import {
  createCommentSchema,
  deviceFixOf,
  idParamSchema,
  pinCommentsQuerySchema,
} from "@/lib/validation/schemas";
import { createComment, listPinComments, notifyPinCommented } from "@/server/services/pins";
import type { CommentResponse, PinCommentsResponse } from "@/types/api";

type Ctx = { params: Promise<{ id: string }> };

/**
 * GET /api/pins/:id/comments?sort=popular|newest|oldest&limit&offset&community_id?
 * → PinCommentsResponse (404 NOT_FOUND when the pin does not exist, or the
 * viewer is not a member of `community_id`).
 */
export async function GET(request: NextRequest, { params }: Ctx) {
  try {
    const session = await getSession();
    const viewerId = session?.user.id ?? null;

    const rl = enforceRateLimit(request, "pins:comments:list", RATE_LIMITS.read, viewerId);
    if (rl) return rl;

    const p = parseParams(await params, idParamSchema);
    if (p.error) return p.error;
    const q = parseQuery(request, pinCommentsQuerySchema);
    if (q.error) return q.error;

    const { community_id, ...rest } = q.data;
    const body: PinCommentsResponse = await listPinComments({
      pinId: p.data.id,
      viewerId,
      communityId: community_id,
      ...rest,
    });
    return json(body, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return handleRouteError(error, "GET /api/pins/:id/comments");
  }
}

/**
 * POST /api/pins/:id/comments (JSON { text, photo_url?, user_lat?, user_lng?,
 * accuracy? }) → 201 { comment }; a device fix near the pin makes it
 * `verified_visit` ("Was here"), a far one is ignored.
 * 409 CONFLICT when the user already commented, 403 on a block relation
 * with the pin owner, 404 when the pin is gone.
 */
export async function POST(request: NextRequest, { params }: Ctx) {
  try {
    const csrf = checkCsrfOrigin(request);
    if (csrf) return csrf;

    const { session, error: authError } = await requireSession();
    if (authError) return authError;

    const rl = enforceRateLimit(request, "comments:create", RATE_LIMITS.write, session.user.id);
    if (rl) return rl;

    const p = parseParams(await params, idParamSchema);
    if (p.error) return p.error;
    const body = await parseBody(request, createCommentSchema);
    if (body.error) return body.error;

    const result: CommentResponse = {
      comment: await createComment({
        pinId: p.data.id,
        userId: session.user.id,
        text: body.data.text,
        photoUrl: body.data.photo_url,
        device: deviceFixOf(body.data),
      }),
    };

    after(() =>
      notifyPinCommented({
        pinId: p.data.id,
        commentId: result.comment.id,
        commenterId: session.user.id,
      })
    );

    return json(result, { status: 201 });
  } catch (error) {
    return handleRouteError(error, "POST /api/pins/:id/comments");
  }
}
