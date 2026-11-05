import type { NextRequest } from "next/server";
import {
  checkCsrfOrigin,
  enforceRateLimit,
  handleRouteError,
  json,
  parseParams,
  requireSession,
} from "@/server/http/api-helpers";
import { RATE_LIMITS } from "@/server/http/rate-limit";
import { idParamSchema } from "@/lib/validation/schemas";
import { resetInviteCode } from "@/server/services/communities";
import type { CommunityInviteResponse } from "@/types/api";

/** POST /api/communities/:id/invite → CommunityInviteResponse (founder only; old link stops working) */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const csrf = checkCsrfOrigin(request);
    if (csrf) return csrf;
    const { session, error } = await requireSession();
    if (error) return error;
    const rl = enforceRateLimit(request, "communities:invite", RATE_LIMITS.write, session.user.id);
    if (rl) return rl;
    const p = parseParams(await params, idParamSchema);
    if (p.error) return p.error;
    const body: CommunityInviteResponse = {
      invite_code: await resetInviteCode(p.data.id, session.user.id),
    };
    return json(body);
  } catch (error) {
    return handleRouteError(error, "POST /api/communities/:id/invite");
  }
}
