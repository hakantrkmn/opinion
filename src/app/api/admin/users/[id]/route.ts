import { NextRequest } from "next/server";
import {
  checkCsrfOrigin,
  enforceRateLimit,
  handleRouteError,
  noContent,
  parseParams,
  requireAdmin,
} from "@/server/http/api-helpers";
import { RATE_LIMITS } from "@/server/http/rate-limit";
import { idParamSchema } from "@/lib/validation/user-schemas";
import { deleteUser } from "@/server/services/adminService";
import { recordAudit } from "@/server/services/audit-log";

/**
 * DELETE /api/admin/users/:id → 204. Soft-deletes ("bans") the account the
 * same way self-deletion does. 403 for admins and for yourself.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const csrf = checkCsrfOrigin(request);
    if (csrf) return csrf;
    const { session, error } = await requireAdmin();
    if (error) return error;
    const rl = enforceRateLimit(request, "admin:delete", RATE_LIMITS.admin, session.user.id);
    if (rl) return rl;
    const p = parseParams(await params, idParamSchema);
    if (p.error) return p.error;

    await deleteUser(session.user.id, p.data.id);
    await recordAudit({
      actorId: session.user.id,
      actorEmail: session.user.email,
      action: "admin.user.delete",
      targetType: "user",
      targetId: p.data.id,
    });
    return noContent();
  } catch (error) {
    return handleRouteError(error, "DELETE /api/admin/users/:id");
  }
}
