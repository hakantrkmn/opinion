import type { NextRequest } from "next/server";
import {
  checkCsrfOrigin,
  enforceRateLimit,
  handleRouteError,
  json,
  parseBody,
  requireSession,
} from "@/server/http/api-helpers";
import { RATE_LIMITS } from "@/server/http/rate-limit";
import { markNotificationsReadSchema } from "@/lib/validation/schemas";
import { markNotificationsRead } from "@/server/services/inbox";
import type { UnreadNotificationsResponse } from "@/types/api";

/**
 * POST /api/notifications/read (JSON `{ all: true }` or `{ ids: [...] }`,
 * optional `seen_until`) → { unread_count }. Ids that aren't yours or are
 * already read are ignored; rows updated after `seen_until` stay unread.
 */
export async function POST(request: NextRequest) {
  try {
    const csrf = checkCsrfOrigin(request);
    if (csrf) return csrf;
    const { session, error } = await requireSession();
    if (error) return error;
    const rl = enforceRateLimit(request, "notifications:read", RATE_LIMITS.write, session.user.id);
    if (rl) return rl;
    const body = await parseBody(request, markNotificationsReadSchema);
    if (body.error) return body.error;

    const result: UnreadNotificationsResponse = {
      unread_count: await markNotificationsRead(
        session.user.id,
        "all" in body.data ? "all" : body.data.ids,
        body.data.seen_until
      ),
    };
    return json(result);
  } catch (error) {
    return handleRouteError(error, "POST /api/notifications/read");
  }
}
