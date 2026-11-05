import type { NextRequest } from "next/server";
import {
  checkCsrfOrigin,
  enforceRateLimit,
  getSession,
  handleRouteError,
  json,
  parseParams,
  requireSession,
} from "@/server/http/api-helpers";
import { RATE_LIMITS } from "@/server/http/rate-limit";
import { inviteCodeParamSchema } from "@/lib/validation/schemas";
import { joinByInvite, previewInvite } from "@/server/services/communities";
import type { CommunityInvitePreview, CommunityResponse } from "@/types/api";

type Ctx = { params: Promise<{ code: string }> };

/** GET /api/communities/invites/:code → CommunityInvitePreview (404 for unknown / reset codes) */
export async function GET(request: NextRequest, { params }: Ctx) {
  try {
    const session = await getSession();
    const viewerId = session?.user.id ?? null;
    const rl = enforceRateLimit(request, "communities:invite:get", RATE_LIMITS.read, viewerId);
    if (rl) return rl;
    const p = parseParams(await params, inviteCodeParamSchema);
    if (p.error) return p.error;
    const body: CommunityInvitePreview = await previewInvite(p.data.code, viewerId);
    return json(body, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return handleRouteError(error, "GET /api/communities/invites/:code");
  }
}

/** POST /api/communities/invites/:code → CommunityResponse (joins; idempotent) */
export async function POST(request: NextRequest, { params }: Ctx) {
  try {
    const csrf = checkCsrfOrigin(request);
    if (csrf) return csrf;
    const { session, error } = await requireSession();
    if (error) return error;
    const rl = enforceRateLimit(request, "communities:join", RATE_LIMITS.write, session.user.id);
    if (rl) return rl;
    const p = parseParams(await params, inviteCodeParamSchema);
    if (p.error) return p.error;
    const body: CommunityResponse = await joinByInvite(p.data.code, session.user.id);
    return json(body);
  } catch (error) {
    return handleRouteError(error, "POST /api/communities/invites/:code");
  }
}
