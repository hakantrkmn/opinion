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
import { idParamSchema, voteCommentSchema } from "@/lib/validation/schemas";
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

    const rl = enforceRateLimit(request, "comment:vote", RATE_LIMITS.vote, session.user.id);
    if (rl) return rl;

    const paramParsed = idParamSchema.safeParse(await params);
    if (!paramParsed.success) return errorResponse(400, ApiErrorCode.BAD_REQUEST, "Invalid id");

    const body = await parseBody(request, voteCommentSchema);
    if (body.error) return body.error;

    const { success, error } = await pinService.voteComment(
      paramParsed.data.id,
      body.data.value,
      session.user.id
    );
    if (error) return errorResponse(400, ApiErrorCode.BAD_REQUEST, error);
    return json({ success });
  } catch (error) {
    console.error("Vote POST error:", error);
    return errorResponse(500, ApiErrorCode.INTERNAL_ERROR, "Failed to vote");
  }
}
