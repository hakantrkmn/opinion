import type { NextRequest } from "next/server";
import {
  checkCsrfOrigin,
  enforceRateLimit,
  handleRouteError,
  json,
  noContent,
  parseBody,
  parseParams,
  requireSession,
} from "@/server/http/api-helpers";
import { RATE_LIMITS } from "@/server/http/rate-limit";
import { idParamSchema, updateCommunitySchema } from "@/lib/validation/schemas";
import {
  deleteCommunity,
  getCommunity,
  updateCommunity,
} from "@/server/services/communities";
import type { CommunityResponse } from "@/types/api";

type Ctx = { params: Promise<{ id: string }> };

/** GET /api/communities/:id → CommunityResponse (members only, else 404) */
export async function GET(request: NextRequest, { params }: Ctx) {
  try {
    const { session, error } = await requireSession();
    if (error) return error;
    const rl = enforceRateLimit(request, "communities:get", RATE_LIMITS.read, session.user.id);
    if (rl) return rl;
    const p = parseParams(await params, idParamSchema);
    if (p.error) return p.error;
    const body: CommunityResponse = await getCommunity(p.data.id, session.user.id);
    return json(body, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return handleRouteError(error, "GET /api/communities/:id");
  }
}

/** PATCH /api/communities/:id { name?, description? } → CommunityResponse (founder only) */
export async function PATCH(request: NextRequest, { params }: Ctx) {
  try {
    const csrf = checkCsrfOrigin(request);
    if (csrf) return csrf;
    const { session, error } = await requireSession();
    if (error) return error;
    const rl = enforceRateLimit(request, "communities:update", RATE_LIMITS.write, session.user.id);
    if (rl) return rl;
    const p = parseParams(await params, idParamSchema);
    if (p.error) return p.error;
    const b = await parseBody(request, updateCommunitySchema);
    if (b.error) return b.error;
    const body: CommunityResponse = await updateCommunity(p.data.id, session.user.id, b.data);
    return json(body);
  } catch (error) {
    return handleRouteError(error, "PATCH /api/communities/:id");
  }
}

/** DELETE /api/communities/:id → 204 (founder only) */
export async function DELETE(request: NextRequest, { params }: Ctx) {
  try {
    const csrf = checkCsrfOrigin(request);
    if (csrf) return csrf;
    const { session, error } = await requireSession();
    if (error) return error;
    const rl = enforceRateLimit(request, "communities:delete", RATE_LIMITS.write, session.user.id);
    if (rl) return rl;
    const p = parseParams(await params, idParamSchema);
    if (p.error) return p.error;
    await deleteCommunity(p.data.id, session.user.id);
    return noContent();
  } catch (error) {
    return handleRouteError(error, "DELETE /api/communities/:id");
  }
}
