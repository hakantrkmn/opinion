import type { NextRequest } from "next/server";
import {
  enforceRateLimit,
  handleRouteError,
  json,
  parseQuery,
  requireSession,
} from "@/server/http/api-helpers";
import { RATE_LIMITS } from "@/server/http/rate-limit";
import { offsetPaginationSchema } from "@/server/http/pagination";
import { listNotifications } from "@/server/services/inbox";

/**
 * GET /api/notifications?limit&offset → Paginated<NotificationItem>, newest
 * activity first. Read state is changed with POST /api/notifications/read.
 */
export async function GET(request: NextRequest) {
  try {
    const { session, error } = await requireSession();
    if (error) return error;
    const rl = enforceRateLimit(request, "notifications:list", RATE_LIMITS.read, session.user.id);
    if (rl) return rl;
    const q = parseQuery(request, offsetPaginationSchema(20, 50));
    if (q.error) return q.error;

    return json(await listNotifications(session.user.id, q.data), {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    return handleRouteError(error, "GET /api/notifications");
  }
}
