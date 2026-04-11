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

    const rl = enforceRateLimit(request, "admin:comment:delete", RATE_LIMITS.admin, session.user.id);
    if (rl) return rl;

    const parsed = idParamSchema.safeParse(await params);
    if (!parsed.success) return errorResponse(400, ApiErrorCode.BAD_REQUEST, "Invalid id");

    const result = await adminService.deleteComment(parsed.data.id);
    if (!result.success) {
      return errorResponse(400, ApiErrorCode.BAD_REQUEST, result.error || "Failed to delete comment");
    }

    await recordAudit({
      actorId: session.user.id,
      actorEmail: session.user.email,
      action: "admin.comment.delete",
      targetType: "comment",
      targetId: parsed.data.id,
      metadata: { pinDeleted: result.pinDeleted, pinId: result.pinId },
    });

    return json({
      success: true,
      pinDeleted: result.pinDeleted,
      pinId: result.pinId,
    });
  } catch (err) {
    console.error("Admin delete comment API error:", err);
    return errorResponse(500, ApiErrorCode.INTERNAL_ERROR, "Internal server error");
  }
}
