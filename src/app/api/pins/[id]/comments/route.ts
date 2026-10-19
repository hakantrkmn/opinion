import type { NextRequest } from "next/server";
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
  idParamSchema,
  pinCommentsQuerySchema,
} from "@/lib/validation/schemas";
import { createComment, listPinComments } from "@/server/services/pins";
import type { CommentResponse, PinCommentsResponse } from "@/types/api";

type Ctx = { params: Promise<{ id: string }> };

/**
 * GET /api/pins/:id/comments?sort=popular|newest|oldest&limit&offset
 * → PinCommentsResponse (404 NOT_FOUND when the pin does not exist).
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

    const body: PinCommentsResponse = await listPinComments({
      pinId: p.data.id,
      viewerId,
      ...q.data,
    });
    return json(body, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return handleRouteError(error, "GET /api/pins/:id/comments");
  }
}

/**
 * POST /api/pins/:id/comments (JSON { text, photo_url? }) → 201 { comment }
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
      }),
    };
    return json(result, { status: 201 });
  } catch (error) {
    return handleRouteError(error, "POST /api/pins/:id/comments");
  }
}
