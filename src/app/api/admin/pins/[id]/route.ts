import { NextRequest } from "next/server";
import { adminService } from "@/lib/services/adminService";
import {
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

    const rl = enforceRateLimit(request, "admin:pin:delete", RATE_LIMITS.admin, session.user.id);
    if (rl) return rl;

    const parsed = idParamSchema.safeParse(await params);
    if (!parsed.success) return errorResponse(400, "Invalid id");

    await adminService.deletePin(parsed.data.id);

    await recordAudit({
      actorId: session.user.id,
      actorEmail: session.user.email,
      action: "admin.pin.delete",
      targetType: "pin",
      targetId: parsed.data.id,
    });

    return json({ success: true });
  } catch (err) {
    console.error("Admin delete pin API error:", err);
    return errorResponse(500, "Internal server error");
  }
}
