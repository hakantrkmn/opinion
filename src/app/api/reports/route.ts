import { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { reports, pins, comments } from "@/db/schema/app";
import { user } from "@/db/schema/auth";
import {
  ApiErrorCode,
  errorResponse,
  json,
  parseBody,
  requireSession,
  enforceRateLimit,
  checkCsrfOrigin,
} from "@/lib/api-helpers";
import { createReportSchema } from "@/lib/validation/schemas";
import { RATE_LIMITS } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  try {
    const csrf = checkCsrfOrigin(request);
    if (csrf) return csrf;

    const { session, error: authError } = await requireSession();
    if (authError) return authError;

    const rl = enforceRateLimit(
      request,
      "reports:post",
      RATE_LIMITS.write,
      session.user.id
    );
    if (rl) return rl;

    const parsed = await parseBody(request, createReportSchema);
    if (parsed.error) return parsed.error;

    const { targetType, targetId, reason, note } = parsed.data;

    if (targetType === "user" && targetId === session.user.id) {
      return errorResponse(
        400,
        ApiErrorCode.BAD_REQUEST,
        "You cannot report yourself"
      );
    }

    // Verify target exists; report on something deleted has no value.
    if (targetType === "pin") {
      const [row] = await db
        .select({ userId: pins.userId })
        .from(pins)
        .where(eq(pins.id, targetId))
        .limit(1);
      if (!row)
        return errorResponse(404, ApiErrorCode.NOT_FOUND, "Pin not found");
      if (row.userId === session.user.id) {
        return errorResponse(
          400,
          ApiErrorCode.BAD_REQUEST,
          "You cannot report your own content"
        );
      }
    } else if (targetType === "comment") {
      const [row] = await db
        .select({ userId: comments.userId })
        .from(comments)
        .where(eq(comments.id, targetId))
        .limit(1);
      if (!row)
        return errorResponse(404, ApiErrorCode.NOT_FOUND, "Comment not found");
      if (row.userId === session.user.id) {
        return errorResponse(
          400,
          ApiErrorCode.BAD_REQUEST,
          "You cannot report your own content"
        );
      }
    } else {
      const [row] = await db
        .select({ id: user.id })
        .from(user)
        .where(eq(user.id, targetId))
        .limit(1);
      if (!row)
        return errorResponse(404, ApiErrorCode.NOT_FOUND, "User not found");
    }

    // Idempotent insert — duplicate reports from the same user on the same
    // target are silently ignored thanks to the unique index.
    await db
      .insert(reports)
      .values({
        reporterId: session.user.id,
        targetType,
        targetId,
        reason,
        note: note ?? null,
      })
      .onConflictDoNothing({
        target: [reports.reporterId, reports.targetType, reports.targetId],
      });

    return json({ ok: true });
  } catch (err) {
    console.error("Reports POST error:", err);
    return errorResponse(
      500,
      ApiErrorCode.INTERNAL_ERROR,
      "Failed to submit report"
    );
  }
}
