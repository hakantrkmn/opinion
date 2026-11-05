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
import { createCommunitySchema } from "@/lib/validation/schemas";
import { createCommunity, listMyCommunities } from "@/server/services/communities";
import type { CommunityListResponse, CommunityResponse } from "@/types/api";

/** GET /api/communities → CommunityListResponse (the viewer's communities) */
export async function GET(request: NextRequest) {
  try {
    const { session, error } = await requireSession();
    if (error) return error;
    const rl = enforceRateLimit(request, "communities:list", RATE_LIMITS.read, session.user.id);
    if (rl) return rl;
    const body: CommunityListResponse = { items: await listMyCommunities(session.user.id) };
    return json(body, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return handleRouteError(error, "GET /api/communities");
  }
}

/** POST /api/communities { name, description? } → 201 CommunityResponse (409 at the limit) */
export async function POST(request: NextRequest) {
  try {
    const csrf = checkCsrfOrigin(request);
    if (csrf) return csrf;
    const { session, error } = await requireSession();
    if (error) return error;
    const rl = enforceRateLimit(request, "communities:create", RATE_LIMITS.write, session.user.id);
    if (rl) return rl;
    const b = await parseBody(request, createCommunitySchema);
    if (b.error) return b.error;
    const body: CommunityResponse = await createCommunity(session.user.id, b.data);
    return json(body, { status: 201 });
  } catch (error) {
    return handleRouteError(error, "POST /api/communities");
  }
}
