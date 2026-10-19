import { NextRequest } from "next/server";
import {
  checkCsrfOrigin,
  enforceRateLimit,
  handleRouteError,
  json,
  requireAdmin,
} from "@/server/http/api-helpers";
import { refreshAllUserStats } from "@/server/services/adminService";
import { recordAudit } from "@/server/services/audit-log";

/**
 * POST /api/admin/refresh-stats → { ok: true, duration_ms }
 * Recomputes user_stats for all users via the populate_user_stats() SQL
 * function.
 */
export async function POST(request: NextRequest) {
  try {
    const csrf = checkCsrfOrigin(request);
    if (csrf) return csrf;
    const { session, error } = await requireAdmin();
    if (error) return error;
    const rl = enforceRateLimit(
      request,
      "admin:refresh-stats",
      { limit: 3, windowMs: 60_000 },
      session.user.id
    );
    if (rl) return rl;

    const started = performance.now();
    await refreshAllUserStats();
    const durationMs = Math.round(performance.now() - started);

    await recordAudit({
      actorId: session.user.id,
      actorEmail: session.user.email,
      action: "admin.stats.refresh",
      targetType: "system",
      metadata: { duration_ms: durationMs },
    });
    return json({ ok: true, duration_ms: durationMs });
  } catch (error) {
    return handleRouteError(error, "POST /api/admin/refresh-stats");
  }
}
