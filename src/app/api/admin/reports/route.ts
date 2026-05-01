import { NextRequest } from "next/server";
import { adminService } from "@/lib/services/adminService";
import {
  ApiErrorCode,
  errorResponse,
  json,
  parseQuery,
  requireAdmin,
  enforceRateLimit,
} from "@/lib/api-helpers";
import { adminReportsQuerySchema } from "@/lib/validation/schemas";
import { RATE_LIMITS } from "@/lib/rate-limit";

export async function GET(request: NextRequest) {
  try {
    const { session, error } = await requireAdmin();
    if (error) return error;

    const rl = enforceRateLimit(
      request,
      "admin:reports",
      RATE_LIMITS.admin,
      session.user.id
    );
    if (rl) return rl;

    const parsed = parseQuery(request, adminReportsQuerySchema);
    if (parsed.error) return parsed.error;

    const result = await adminService.getReports(parsed.data);
    return json(result);
  } catch (err) {
    console.error("Admin reports API error:", err);
    return errorResponse(
      500,
      ApiErrorCode.INTERNAL_ERROR,
      "Internal server error"
    );
  }
}
