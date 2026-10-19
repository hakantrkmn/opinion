import { NextRequest } from "next/server";
import { isAPIError } from "better-auth/api";
import { auth } from "@/server/auth/auth";
import {
  authHeaders,
  checkCsrfOrigin,
  enforceRateLimit,
  errorResponse,
  handleRouteError,
  noContent,
  parseBody,
  requireSession,
} from "@/server/http/api-helpers";
import { deleteAccountSchema } from "@/lib/validation/user-schemas";
import { deleteAccount } from "@/server/services/users";

/**
 * DELETE /api/profile/account { password } → 204
 * Requires re-entering the current password. Soft-deletes the account (see
 * deleteAccount) and revokes every session.
 */
export async function DELETE(request: NextRequest) {
  try {
    const csrf = checkCsrfOrigin(request);
    if (csrf) return csrf;
    const { session, error } = await requireSession();
    if (error) return error;
    // Tight limit: this endpoint verifies a password.
    const rl = enforceRateLimit(
      request,
      "account:delete",
      { limit: 5, windowMs: 15 * 60_000 },
      session.user.id
    );
    if (rl) return rl;
    const body = await parseBody(request, deleteAccountSchema);
    if (body.error) return body.error;

    try {
      await auth.api.verifyPassword({
        body: { password: body.data.password },
        headers: await authHeaders(),
      });
    } catch (e) {
      if (isAPIError(e)) {
        return errorResponse(403, "FORBIDDEN", "Incorrect password");
      }
      throw e;
    }

    await deleteAccount(session.user.id);
    return noContent();
  } catch (error) {
    return handleRouteError(error, "DELETE /api/profile/account");
  }
}
