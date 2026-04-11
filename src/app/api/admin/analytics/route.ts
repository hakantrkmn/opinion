import { NextRequest } from "next/server";
import { adminService } from "@/lib/services/adminService";
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

    const rl = enforceRateLimit(request, "admin:analytics", RATE_LIMITS.admin, session.user.id);
    if (rl) return rl;

    const data = await adminService.getAnalytics();
    return json({ data });
  } catch (err) {
    console.error("Admin analytics API error:", err);
    return errorResponse(500, "Internal server error");
  }
}
