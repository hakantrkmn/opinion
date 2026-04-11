import { NextRequest } from "next/server";
import { pinService } from "@/lib/services/pinService";
import {
  errorResponse,
  json,
  getSession,
  parseBody,
  enforceRateLimit,
} from "@/lib/api-helpers";
import { batchCommentsSchema } from "@/lib/validation/schemas";
import { RATE_LIMITS } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    const userId = session?.user?.id;

    const rl = enforceRateLimit(request, "comments:batch", RATE_LIMITS.read, userId);
    if (rl) return rl;

    const body = await parseBody(request, batchCommentsSchema);
    if (body.error) return body.error;

    const { comments, error } = await pinService.getBatchComments(body.data.pinIds, userId);
    if (error) return errorResponse(500, error);
    return json({ comments });
  } catch (error) {
    console.error("Batch comments error:", error);
    return errorResponse(500, "Failed to get comments");
  }
}
