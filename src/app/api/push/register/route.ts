import { NextRequest } from "next/server";
import {
  checkCsrfOrigin,
  enforceRateLimit,
  errors,
  handleRouteError,
  json,
  noContent,
  parseBody,
  requireSession,
} from "@/server/http/api-helpers";
import {
  registerPushTokenSchema,
  unregisterPushTokenSchema,
} from "@/lib/validation/user-schemas";
import { InvalidPushTokenError, pushService } from "@/server/services/pushService";

const PUSH_LIMIT = { limit: 10, windowMs: 60_000 };

/**
 * POST /api/push/register { token, platform, device_name? } → { ok: true }
 * Upserts by token (re-assigns the device to the current user).
 */
export async function POST(request: NextRequest) {
  try {
    const csrf = checkCsrfOrigin(request);
    if (csrf) return csrf;
    const { session, error } = await requireSession();
    if (error) return error;
    const rl = enforceRateLimit(request, "push:register", PUSH_LIMIT, session.user.id);
    if (rl) return rl;
    const body = await parseBody(request, registerPushTokenSchema);
    if (body.error) return body.error;

    try {
      await pushService.registerToken({
        userId: session.user.id,
        token: body.data.token,
        platform: body.data.platform,
        deviceName: body.data.device_name ?? null,
      });
    } catch (e) {
      if (e instanceof InvalidPushTokenError) return errors.badRequest(e.message);
      throw e;
    }
    return json({ ok: true });
  } catch (error) {
    return handleRouteError(error, "POST /api/push/register");
  }
}

/**
 * DELETE /api/push/register { token } → 204
 * Call before signing out on the device. Only removes the caller's token.
 */
export async function DELETE(request: NextRequest) {
  try {
    const csrf = checkCsrfOrigin(request);
    if (csrf) return csrf;
    const { session, error } = await requireSession();
    if (error) return error;
    const rl = enforceRateLimit(request, "push:unregister", PUSH_LIMIT, session.user.id);
    if (rl) return rl;
    const body = await parseBody(request, unregisterPushTokenSchema);
    if (body.error) return body.error;

    await pushService.unregisterToken(session.user.id, body.data.token);
    return noContent();
  } catch (error) {
    return handleRouteError(error, "DELETE /api/push/register");
  }
}
