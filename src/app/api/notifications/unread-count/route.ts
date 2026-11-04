import type { NextRequest } from "next/server";
import {
  enforceRateLimit,
  handleRouteError,
  json,
  requireSession,
} from "@/server/http/api-helpers";
import { RATE_LIMITS } from "@/server/http/rate-limit";
import { countUnreadNotifications } from "@/server/services/inbox";
import type { UnreadNotificationsResponse } from "@/types/api";

/** GET /api/notifications/unread-count → { unread_count } (badge polling). */
export async function GET(request: NextRequest) {
  try {
    const { session, error } = await requireSession();
    if (error) return error;
    const rl = enforceRateLimit(request, "notifications:unread", RATE_LIMITS.read, session.user.id);
    if (rl) return rl;

    const body: UnreadNotificationsResponse = {
      unread_count: await countUnreadNotifications(session.user.id),
    };
    return json(body, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return handleRouteError(error, "GET /api/notifications/unread-count");
  }
}
