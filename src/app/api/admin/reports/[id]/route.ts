import { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { adminService } from "@/lib/services/adminService";
import {
  ApiErrorCode,
  errorResponse,
  json,
  parseBody,
  requireAdmin,
  enforceRateLimit,
  checkCsrfOrigin,
} from "@/lib/api-helpers";
import {
  adminReportActionSchema,
  idParamSchema,
} from "@/lib/validation/schemas";
import { RATE_LIMITS } from "@/lib/rate-limit";
import { recordAudit } from "@/lib/audit-log";
import { db } from "@/db";
import { reports } from "@/db/schema/app";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const csrf = checkCsrfOrigin(request);
    if (csrf) return csrf;

    const { session, error } = await requireAdmin();
    if (error) return error;

    const rl = enforceRateLimit(
      request,
      "admin:report:patch",
      RATE_LIMITS.admin,
      session.user.id
    );
    if (rl) return rl;

    const paramParsed = idParamSchema.safeParse(await params);
    if (!paramParsed.success)
      return errorResponse(400, ApiErrorCode.BAD_REQUEST, "Invalid id");

    const body = await parseBody(request, adminReportActionSchema);
    if (body.error) return body.error;

    const reportId = paramParsed.data.id;

    const [report] = await db
      .select({
        id: reports.id,
        targetType: reports.targetType,
        targetId: reports.targetId,
      })
      .from(reports)
      .where(eq(reports.id, reportId))
      .limit(1);

    if (!report)
      return errorResponse(404, ApiErrorCode.NOT_FOUND, "Report not found");

    if (body.data.action === "resolve") {
      const result = await adminService.resolveReport(reportId, session.user.id);
      if (!result.success)
        return errorResponse(
          400,
          ApiErrorCode.BAD_REQUEST,
          result.error ?? "Failed"
        );
      await recordAudit({
        actorId: session.user.id,
        actorEmail: session.user.email,
        action: "admin.report.resolve",
        targetType: "report",
        targetId: reportId,
      });
      return json({ success: true });
    }

    if (body.data.action === "dismiss") {
      const result = await adminService.dismissReport(reportId, session.user.id);
      if (!result.success)
        return errorResponse(
          400,
          ApiErrorCode.BAD_REQUEST,
          result.error ?? "Failed"
        );
      await recordAudit({
        actorId: session.user.id,
        actorEmail: session.user.email,
        action: "admin.report.dismiss",
        targetType: "report",
        targetId: reportId,
      });
      return json({ success: true });
    }

    // delete_target
    if (report.targetType === "pin") {
      await adminService.deletePin(report.targetId);
      await recordAudit({
        actorId: session.user.id,
        actorEmail: session.user.email,
        action: "admin.report.delete_target.pin",
        targetType: "pin",
        targetId: report.targetId,
        metadata: { reportId },
      });
    } else if (report.targetType === "comment") {
      const result = await adminService.deleteComment(report.targetId);
      if (!result.success) {
        return errorResponse(
          400,
          ApiErrorCode.BAD_REQUEST,
          result.error ?? "Failed to delete comment"
        );
      }
      await recordAudit({
        actorId: session.user.id,
        actorEmail: session.user.email,
        action: "admin.report.delete_target.comment",
        targetType: "comment",
        targetId: report.targetId,
        metadata: {
          reportId,
          pinDeleted: result.pinDeleted,
          pinId: result.pinId,
        },
      });
    } else if (report.targetType === "user") {
      if (report.targetId === session.user.id) {
        return errorResponse(
          400,
          ApiErrorCode.BAD_REQUEST,
          "Cannot delete your own admin account"
        );
      }
      await adminService.deleteUser(report.targetId);
      await recordAudit({
        actorId: session.user.id,
        actorEmail: session.user.email,
        action: "admin.report.delete_target.user",
        targetType: "user",
        targetId: report.targetId,
        metadata: { reportId },
      });
    }

    await adminService.resolveAllReportsForTarget(
      report.targetType,
      report.targetId,
      session.user.id
    );

    return json({ success: true });
  } catch (err) {
    console.error("Admin report PATCH error:", err);
    return errorResponse(
      500,
      ApiErrorCode.INTERNAL_ERROR,
      "Internal server error"
    );
  }
}
