import { NextRequest } from "next/server";
import { adminService } from "@/lib/services/adminService";
import {
  ApiErrorCode,
  errorResponse,
  json,
  requireAdmin,
  enforceRateLimit,
  checkCsrfOrigin,
} from "@/lib/api-helpers";
import { idParamSchema } from "@/lib/validation/schemas";
import { RATE_LIMITS } from "@/lib/rate-limit";
import { recordAudit } from "@/lib/audit-log";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const csrf = checkCsrfOrigin(request);
    if (csrf) return csrf;

    const { session, error } = await requireAdmin();
    if (error) return error;

    const rl = enforceRateLimit(request, "admin:user:delete", RATE_LIMITS.admin, session.user.id);
    if (rl) return rl;

    const parsed = idParamSchema.safeParse(await params);
    if (!parsed.success) return errorResponse(400, ApiErrorCode.BAD_REQUEST, "Invalid id");

    if (parsed.data.id === session.user.id) {
      return errorResponse(400, ApiErrorCode.BAD_REQUEST, "Cannot delete your own admin account");
    }

    await adminService.deleteUser(parsed.data.id);

    await recordAudit({
      actorId: session.user.id,
      actorEmail: session.user.email,
      action: "admin.user.delete",
      targetType: "user",
      targetId: parsed.data.id,
    });

    return json({ success: true });
  } catch (err) {
    console.error("Admin delete user API error:", err);
    return errorResponse(500, ApiErrorCode.INTERNAL_ERROR, "Internal server error");
  }
}
