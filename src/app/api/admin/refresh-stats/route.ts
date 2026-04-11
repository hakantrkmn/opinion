import { NextRequest } from "next/server";
import { adminService } from "@/lib/services/adminService";
import {
  errorResponse,
  json,
  requireAdmin,
  enforceRateLimit,
  checkCsrfOrigin,
} from "@/lib/api-helpers";
import { RATE_LIMITS } from "@/lib/rate-limit";
import { recordAudit } from "@/lib/audit-log";

export async function POST(request: NextRequest) {
  try {
    const csrf = checkCsrfOrigin(request);
    if (csrf) return csrf;

    const { session, error: authError } = await requireAdmin();
    if (authError) return authError;

    const rl = enforceRateLimit(request, "admin:refresh-stats", RATE_LIMITS.admin, session.user.id);
    if (rl) return rl;

    const startTime = performance.now();
    const { success, error } = await adminService.refreshAllUserStats();
    if (!success) {
      console.error("Failed to refresh user statistics:", error);
      return errorResponse(500, error || "Failed to refresh user statistics");
    }

    const duration = Number((performance.now() - startTime).toFixed(2));
    const summary = await adminService.getUserStatsSummary();

    await recordAudit({
      actorId: session.user.id,
      actorEmail: session.user.email,
      action: "admin.stats.refresh",
      targetType: "system",
      metadata: { duration },
    });

    return json({
      success: true,
      message: "All user statistics refreshed successfully",
      performanceInfo: {
        duration,
        method: "bulk_refresh",
        timestamp: new Date().toISOString(),
      },
      summary: summary || null,
    });
  } catch (err) {
    console.error("Error in refresh-stats API:", err);
    return errorResponse(500, "Internal server error while refreshing statistics");
  }
}
