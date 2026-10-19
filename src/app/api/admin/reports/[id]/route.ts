import { NextRequest } from "next/server";
import {
  checkCsrfOrigin,
  enforceRateLimit,
  errors,
  handleRouteError,
  json,
  parseBody,
  parseParams,
  requireAdmin,
} from "@/server/http/api-helpers";
import { RATE_LIMITS } from "@/server/http/rate-limit";
import {
  adminReportActionSchema,
  idParamSchema,
} from "@/lib/validation/user-schemas";
import {
  deleteComment,
  deletePin,
  deleteUser,
  getReport,
  resolveAllReportsForTarget,
  setReportStatus,
} from "@/server/services/adminService";
import { recordAudit } from "@/server/services/audit-log";

/**
 * PATCH /api/admin/reports/:id { action: resolve|dismiss|delete_target }
 *   → { report: { id, status } }
 * delete_target removes the reported pin/comment (or soft-deletes the user)
 * and resolves every open report on that target.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const csrf = checkCsrfOrigin(request);
    if (csrf) return csrf;
    const { session, error } = await requireAdmin();
    if (error) return error;
    const rl = enforceRateLimit(request, "admin:report", RATE_LIMITS.admin, session.user.id);
    if (rl) return rl;
    const p = parseParams(await params, idParamSchema);
    if (p.error) return p.error;
    const body = await parseBody(request, adminReportActionSchema);
    if (body.error) return body.error;

    const report = await getReport(p.data.id);
    if (!report) return errors.notFound("Report not found");
    const actor = { actorId: session.user.id, actorEmail: session.user.email };
    const { action } = body.data;

    if (action === "resolve" || action === "dismiss") {
      const status = action === "resolve" ? "resolved" : "dismissed";
      await setReportStatus(report.id, status, session.user.id);
      await recordAudit({
        ...actor,
        action: action === "resolve" ? "admin.report.resolve" : "admin.report.dismiss",
        targetType: "report",
        targetId: report.id,
      });
      return json({ report: { id: report.id, status } });
    }

    // delete_target
    let metadata: Record<string, unknown> = { reportId: report.id };
    if (report.targetType === "pin") {
      await deletePin(report.targetId);
    } else if (report.targetType === "comment") {
      const result = await deleteComment(report.targetId);
      if (result) metadata = { ...metadata, ...result };
    } else {
      await deleteUser(session.user.id, report.targetId);
    }
    await resolveAllReportsForTarget(report.targetType, report.targetId, session.user.id);
    await recordAudit({
      ...actor,
      action: `admin.report.delete_target.${report.targetType}` as
        | "admin.report.delete_target.pin"
        | "admin.report.delete_target.comment"
        | "admin.report.delete_target.user",
      targetType: report.targetType as "pin" | "comment" | "user",
      targetId: report.targetId,
      metadata,
    });
    return json({ report: { id: report.id, status: "resolved" } });
  } catch (error) {
    return handleRouteError(error, "PATCH /api/admin/reports/:id");
  }
}
