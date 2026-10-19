import { NextRequest } from "next/server";
import {
  enforceRateLimit,
  handleRouteError,
  json,
  parseQuery,
  requireSession,
} from "@/server/http/api-helpers";
import { RATE_LIMITS } from "@/server/http/rate-limit";
import { offsetPaginationSchema } from "@/server/http/pagination";
import { listUserComments } from "@/server/services/users";

/** GET /api/profile/comments?limit&offset → Paginated<UserCommentItem> (own) */
export async function GET(request: NextRequest) {
  try {
    const { session, error } = await requireSession();
    if (error) return error;
    const rl = enforceRateLimit(request, "profile:comments", RATE_LIMITS.read, session.user.id);
    if (rl) return rl;
    const q = parseQuery(request, offsetPaginationSchema());
    if (q.error) return q.error;

    return json(await listUserComments(session.user.id, session.user.id, q.data));
  } catch (error) {
    return handleRouteError(error, "GET /api/profile/comments");
  }
}
