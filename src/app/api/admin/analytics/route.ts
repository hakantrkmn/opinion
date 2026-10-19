import { NextRequest } from "next/server";
import {
  enforceRateLimit,
  handleRouteError,
  json,
  requireAdmin,
} from "@/server/http/api-helpers";
import { RATE_LIMITS } from "@/server/http/rate-limit";
import { getAnalytics } from "@/server/services/adminService";

/** GET /api/admin/analytics → { analytics: AdminAnalytics } */
export async function GET(request: NextRequest) {
  try {
    const { session, error } = await requireAdmin();
    if (error) return error;
    const rl = enforceRateLimit(request, "admin:analytics", RATE_LIMITS.admin, session.user.id);
    if (rl) return rl;

    return json({ analytics: await getAnalytics() });
  } catch (error) {
    return handleRouteError(error, "GET /api/admin/analytics");
  }
}
