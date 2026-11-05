import type { NextRequest } from "next/server";
import {
  enforceRateLimit,
  handleRouteError,
  json,
  parseParams,
  parseQuery,
  requireSession,
} from "@/server/http/api-helpers";
import { RATE_LIMITS } from "@/server/http/rate-limit";
import { offsetPaginationSchema } from "@/server/http/pagination";
import { idParamSchema } from "@/lib/validation/schemas";
import { listCommunityMembers } from "@/server/services/communities";

/** GET /api/communities/:id/members?limit&offset → Paginated<CommunityMember> (members only) */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { session, error } = await requireSession();
    if (error) return error;
    const rl = enforceRateLimit(request, "communities:members", RATE_LIMITS.read, session.user.id);
    if (rl) return rl;
    const p = parseParams(await params, idParamSchema);
    if (p.error) return p.error;
    const q = parseQuery(request, offsetPaginationSchema());
    if (q.error) return q.error;
    return json(await listCommunityMembers(p.data.id, session.user.id, q.data), {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    return handleRouteError(error, "GET /api/communities/:id/members");
  }
}
