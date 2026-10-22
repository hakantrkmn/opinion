import { NextRequest } from "next/server";
import {
  checkCsrfOrigin,
  enforceRateLimit,
  errors,
  handleRouteError,
  json,
  parseBody,
  requireAdmin,
} from "@/server/http/api-helpers";
import { sendNotificationSchema } from "@/lib/validation/user-schemas";
import { pushService } from "@/server/services/pushService";
import { recordAudit } from "@/server/services/audit-log";
import type { SendNotificationResult } from "@/types/userTypes";

/**
 * POST /api/admin/notifications/send
 *   { target: { type: "user", user_id } | { type: "all" }, title, body, data? }
 *   → SendNotificationResult
 */
export async function POST(request: NextRequest) {
  try {
    const csrf = checkCsrfOrigin(request);
    if (csrf) return csrf;
    const { session, error } = await requireAdmin();
    if (error) return error;
    const rl = enforceRateLimit(
      request,
      "admin:notifications:send",
      { limit: 10, windowMs: 60_000 },
      session.user.id
    );
    if (rl) return rl;
    const parsed = await parseBody(request, sendNotificationSchema);
    if (parsed.error) return parsed.error;

    const { target, title, body, data } = parsed.data;
    const devices =
      target.type === "user"
        ? await pushService.getActiveDevicesForUser(target.user_id)
        : await pushService.getAllActiveDevices();

    if (devices.length === 0 && target.type === "user") {
      return errors.notFound("User has no active devices");
    }

    const r = await pushService.sendToDevices(devices, { title, body, data });
    const result: SendNotificationResult = {
      recipient_count: r.recipientCount,
      sent: r.sent,
      failed: r.failed,
      deactivated: r.deactivated,
    };

    await recordAudit({
      actorId: session.user.id,
      actorEmail: session.user.email,
      action: "admin.notification.send",
      targetType: target.type === "user" ? "user" : "broadcast",
      targetId: target.type === "user" ? target.user_id : null,
      metadata: { title, body, data, ...result },
    });

    return json(result);
  } catch (error) {
    return handleRouteError(error, "POST /api/admin/notifications/send");
  }
}
