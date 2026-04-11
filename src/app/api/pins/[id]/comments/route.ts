import { NextRequest } from "next/server";
import { pinService } from "@/lib/services/pinService";
import {
  ApiErrorCode,
  errorResponse,
  json,
  getSession,
  requireSession,
  parseBody,
  enforceRateLimit,
  checkCsrfOrigin,
} from "@/lib/api-helpers";
import { idParamSchema, createCommentSchema } from "@/lib/validation/schemas";
import { RATE_LIMITS } from "@/lib/rate-limit";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    const userId = session?.user?.id;

    const rl = enforceRateLimit(request, "pin:comments:get", RATE_LIMITS.read, userId);
    if (rl) return rl;

    const parsed = idParamSchema.safeParse(await params);
    if (!parsed.success) return errorResponse(400, ApiErrorCode.BAD_REQUEST, "Invalid id");

    const { comments, error } = await pinService.getPinComments(parsed.data.id, userId);
    return json({ comments, error });
  } catch (error) {
    console.error("Pin comments GET error:", error);
    return errorResponse(500, ApiErrorCode.INTERNAL_ERROR, "Failed to get comments");
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const csrf = checkCsrfOrigin(request);
    if (csrf) return csrf;

    const { session, error: authError } = await requireSession();
    if (authError) return authError;

    const rl = enforceRateLimit(request, "pin:comments:post", RATE_LIMITS.write, session.user.id);
    if (rl) return rl;

    const paramParsed = idParamSchema.safeParse(await params);
    if (!paramParsed.success) return errorResponse(400, ApiErrorCode.BAD_REQUEST, "Invalid id");

    const body = await parseBody(request, createCommentSchema);
    if (body.error) return body.error;

    const { comment, error } = await pinService.addComment(
      paramParsed.data.id,
      body.data.text,
      session.user.id,
      body.data.photoUrl ?? undefined,
      body.data.photoMetadata ?? undefined
    );
    if (error) return errorResponse(400, ApiErrorCode.BAD_REQUEST, error);
    return json({ comment });
  } catch (error) {
    console.error("Pin comment POST error:", error);
    return errorResponse(500, ApiErrorCode.INTERNAL_ERROR, "Failed to add comment");
  }
}
