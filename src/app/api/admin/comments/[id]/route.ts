import { NextRequest } from "next/server";
import {
  checkCsrfOrigin,
  enforceRateLimit,
  errors,
  handleRouteError,
  json,
  parseParams,
  requireAdmin,
} from "@/server/http/api-helpers";
import { RATE_LIMITS } from "@/server/http/rate-limit";
import { idParamSchema } from "@/lib/validation/user-schemas";
import { deleteComment } from "@/server/services/adminService";
import { recordAudit } from "@/server/services/audit-log";

/** DELETE /api/admin/comments/:id → { pin_deleted, pin_id } */
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

    const result = await deleteComment(p.data.id);
    if (!result) return errors.notFound("Comment not found");
    await recordAudit({
      actorId: session.user.id,
      actorEmail: session.user.email,
      action: "admin.comment.delete",
      targetType: "comment",
      targetId: p.data.id,
      metadata: result,
    });
    return json(result);
  } catch (error) {
    return handleRouteError(error, "DELETE /api/admin/comments/:id");
  }
}
