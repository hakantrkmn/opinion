import { NextRequest } from "next/server";
import {
  errorResponse,
  json,
  requireAdmin,
  parseBody,
  enforceRateLimit,
  checkCsrfOrigin,
} from "@/lib/api-helpers";
import { sendNotificationSchema } from "@/lib/validation/schemas";
import { pushService } from "@/lib/services/pushService";
import { recordAudit } from "@/lib/audit-log";
import { RATE_LIMITS } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  try {
    const csrf = checkCsrfOrigin(request);
    if (csrf) return csrf;

    const { session, error } = await requireAdmin();
    if (error) return error;

    const rl = enforceRateLimit(
      request,
      "admin:notifications:send",
      RATE_LIMITS.admin,
      session.user.id
    );
    if (rl) return rl;

    const parsed = await parseBody(request, sendNotificationSchema);
    if (parsed.error) return parsed.error;

    const { target, title, body, data } = parsed.data;

    const tokens =
      target.type === "user"
        ? await pushService.getActiveTokensForUser(target.userId)
        : await pushService.getAllActiveTokens();

    if (tokens.length === 0) {
      await recordAudit({
        actorId: session.user.id,
        actorEmail: session.user.email,
        action: "admin.notification.send",
        targetType: target.type === "user" ? "user" : "broadcast",
        targetId: target.type === "user" ? target.userId : null,
        metadata: { title, body, data, recipientCount: 0, sent: 0, failed: 0, deactivated: 0 },
      });
      return json({ sent: 0, failed: 0, deactivated: 0, recipientCount: 0 });
    }

    const result = await pushService.sendToTokens(tokens, { title, body, data });

    await recordAudit({
      actorId: session.user.id,
      actorEmail: session.user.email,
      action: "admin.notification.send",
      targetType: target.type === "user" ? "user" : "broadcast",
      targetId: target.type === "user" ? target.userId : null,
      metadata: {
        title,
        body,
        data,
        recipientCount: result.recipientCount,
        sent: result.sent,
        failed: result.failed,
        deactivated: result.deactivated,
      },
    });

    return json(result);
  } catch (err) {
    console.error("Admin notification send error:", err);
    return errorResponse(500, "Internal server error");
  }
}
