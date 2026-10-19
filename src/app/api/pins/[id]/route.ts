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
import { idParamSchema } from "@/lib/validation/schemas";
import { deletePin, getPinById } from "@/server/services/pins";
import type { DeleteCommentResponse, PinResponse } from "@/types/api";

type Ctx = { params: Promise<{ id: string }> };

/** GET /api/pins/:id → PinResponse (404 NOT_FOUND). */
export async function GET(request: NextRequest, { params }: Ctx) {
  try {
    const session = await getSession();
    const viewerId = session?.user.id ?? null;

    const rl = enforceRateLimit(request, "pins:get", RATE_LIMITS.read, viewerId);
    if (rl) return rl;

    const p = parseParams(await params, idParamSchema);
    if (p.error) return p.error;

    const body: PinResponse = { pin: await getPinById(p.data.id, viewerId) };
    return json(body, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return handleRouteError(error, "GET /api/pins/:id");
  }
}

/**
 * DELETE /api/pins/:id — owner only (403), 404 when missing.
 * → { pin_deleted: true, pin_id }
 */
export async function DELETE(request: NextRequest, { params }: Ctx) {
  try {
    const csrf = checkCsrfOrigin(request);
    if (csrf) return csrf;

    const { session, error: authError } = await requireSession();
    if (authError) return authError;

    const rl = enforceRateLimit(request, "pins:delete", RATE_LIMITS.write, session.user.id);
    if (rl) return rl;

    const p = parseParams(await params, idParamSchema);
    if (p.error) return p.error;

    const body: DeleteCommentResponse = await deletePin(p.data.id, session.user.id);
    return json(body);
  } catch (error) {
    return handleRouteError(error, "DELETE /api/pins/:id");
  }
}
