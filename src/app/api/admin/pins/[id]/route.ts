import { NextRequest } from "next/server";
import {
  checkCsrfOrigin,
  enforceRateLimit,
  errors,
  handleRouteError,
  noContent,
  parseParams,
  requireAdmin,
} from "@/server/http/api-helpers";
import { RATE_LIMITS } from "@/server/http/rate-limit";
import { idParamSchema } from "@/lib/validation/user-schemas";
import { deletePin } from "@/server/services/adminService";
import { recordAudit } from "@/server/services/audit-log";

/** DELETE /api/admin/pins/:id → 204 (pin, comments and photos) */
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

    const found = await deletePin(p.data.id);
    if (!found) return errors.notFound("Pin not found");
    await recordAudit({
      actorId: session.user.id,
      actorEmail: session.user.email,
      action: "admin.pin.delete",
      targetType: "pin",
      targetId: p.data.id,
    });
    return noContent();
  } catch (error) {
    return handleRouteError(error, "DELETE /api/admin/pins/:id");
  }
}
