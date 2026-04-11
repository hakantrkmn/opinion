import { NextRequest } from "next/server";
import { adminService } from "@/lib/services/adminService";
import {
  errorResponse,
  json,
  requireAdmin,
  parseQuery,
  enforceRateLimit,
} from "@/lib/api-helpers";
import { paginationSchema } from "@/lib/validation/schemas";
import { RATE_LIMITS } from "@/lib/rate-limit";

export async function GET(request: NextRequest) {
  try {
    const { session, error } = await requireAdmin();
    if (error) return error;

    const rl = enforceRateLimit(request, "admin:pins", RATE_LIMITS.admin, session.user.id);
    if (rl) return rl;

    const parsed = parseQuery(request, paginationSchema);
    if (parsed.error) return parsed.error;

    const { data, pagination } = await adminService.getAllPins(
      parsed.data.page,
      parsed.data.pageSize
    );
    return json({ data, pagination });
  } catch (err) {
    console.error("Admin pins API error:", err);
    return errorResponse(500, "Internal server error");
  }
}
