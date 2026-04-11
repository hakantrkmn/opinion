import { NextRequest } from "next/server";
import { db } from "@/db";
import { adminAuditLogs } from "@/db/schema/app";
import { eq, desc } from "drizzle-orm";
import {
  errorResponse,
  json,
  requireAdmin,
  enforceRateLimit,
} from "@/lib/api-helpers";
import { RATE_LIMITS } from "@/lib/rate-limit";

export async function GET(request: NextRequest) {
  try {
    const { session, error } = await requireAdmin();
    if (error) return error;

    const rl = enforceRateLimit(
      request,
      "admin:notifications:recent",
      RATE_LIMITS.admin,
      session.user.id
    );
    if (rl) return rl;

    const rows = await db
      .select({
        id: adminAuditLogs.id,
        actorEmail: adminAuditLogs.actorEmail,
        targetType: adminAuditLogs.targetType,
        targetId: adminAuditLogs.targetId,
        metadata: adminAuditLogs.metadata,
        createdAt: adminAuditLogs.createdAt,
      })
      .from(adminAuditLogs)
      .where(eq(adminAuditLogs.action, "admin.notification.send"))
      .orderBy(desc(adminAuditLogs.createdAt))
      .limit(50);

    return json({
      data: rows.map((r) => ({
        id: r.id,
        actorEmail: r.actorEmail,
        targetType: r.targetType,
        targetId: r.targetId,
        metadata: r.metadata as Record<string, unknown> | null,
        createdAt: r.createdAt.toISOString(),
      })),
    });
  } catch (err) {
    console.error("Admin notifications recent error:", err);
    return errorResponse(500, "Internal server error");
  }
}
