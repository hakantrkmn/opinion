import { db } from "@/db";
import { adminAuditLogs } from "@/db/schema/app";
import { headers } from "next/headers";
import { getClientIp } from "@/lib/rate-limit";

export type AuditAction =
  | "admin.user.delete"
  | "admin.pin.delete"
  | "admin.comment.delete"
  | "admin.stats.refresh"
  | "admin.notification.send";

export type AuditTargetType = "user" | "pin" | "comment" | "system" | "broadcast";

export async function recordAudit(params: {
  actorId: string;
  actorEmail?: string | null;
  action: AuditAction;
  targetType: AuditTargetType;
  targetId?: string | null;
  metadata?: Record<string, unknown>;
}) {
  try {
    const h = await headers();
    const fakeReq = { headers: h } as unknown as Request;
    const ipAddress = getClientIp(fakeReq);
    const userAgent = h.get("user-agent");
    await db.insert(adminAuditLogs).values({
      actorId: params.actorId,
      actorEmail: params.actorEmail ?? null,
      action: params.action,
      targetType: params.targetType,
      targetId: params.targetId ?? null,
      metadata: params.metadata ?? {},
      ipAddress,
      userAgent,
    });
  } catch (error) {
    console.error("Audit log write failed:", error);
  }
}
