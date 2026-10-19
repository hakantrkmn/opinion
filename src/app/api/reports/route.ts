import { NextRequest } from "next/server";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/server/db";
import { comments, pins, reports } from "@/server/db/schema/app";
import { user } from "@/server/db/schema/auth";
import {
  checkCsrfOrigin,
  enforceRateLimit,
  errors,
  handleRouteError,
  json,
  parseBody,
  requireSession,
} from "@/server/http/api-helpers";
import { RATE_LIMITS } from "@/server/http/rate-limit";
import { createReportSchema } from "@/lib/validation/user-schemas";

/** Owner of the reported entity, or null when it doesn't exist. */
async function findTargetOwner(type: "pin" | "comment" | "user", id: string) {
  if (type === "pin") {
    const [row] = await db.select({ ownerId: pins.userId }).from(pins).where(eq(pins.id, id)).limit(1);
    return row?.ownerId ?? null;
  }
  if (type === "comment") {
    const [row] = await db
      .select({ ownerId: comments.userId })
      .from(comments)
      .where(eq(comments.id, id))
      .limit(1);
    return row?.ownerId ?? null;
  }
  const [row] = await db
    .select({ ownerId: user.id })
    .from(user)
    .where(and(eq(user.id, id), isNull(user.deletedAt)))
    .limit(1);
  return row?.ownerId ?? null;
}

/**
 * POST /api/reports { target_type, target_id, reason, note? } → 201 { ok }
 * Idempotent per (reporter, target): repeats are accepted and ignored.
 */
export async function POST(request: NextRequest) {
  try {
    const csrf = checkCsrfOrigin(request);
    if (csrf) return csrf;
    const { session, error } = await requireSession();
    if (error) return error;
    const rl = enforceRateLimit(request, "reports:create", RATE_LIMITS.write, session.user.id);
    if (rl) return rl;
    const body = await parseBody(request, createReportSchema);
    if (body.error) return body.error;

    const { target_type, target_id, reason, note } = body.data;
    const ownerId = await findTargetOwner(target_type, target_id);
    if (!ownerId) return errors.notFound(`The reported ${target_type} no longer exists`);
    if (ownerId === session.user.id) {
      return errors.badRequest("You cannot report your own content");
    }

    await db
      .insert(reports)
      .values({
        reporterId: session.user.id,
        targetType: target_type,
        targetId: target_id,
        reason,
        note: note || null,
      })
      .onConflictDoNothing({
        target: [reports.reporterId, reports.targetType, reports.targetId],
      });

    return json({ ok: true }, { status: 201 });
  } catch (error) {
    return handleRouteError(error, "POST /api/reports");
  }
}
