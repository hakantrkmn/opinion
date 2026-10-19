import { NextRequest } from "next/server";
import {
  enforceRateLimit,
  handleRouteError,
  json,
  parseQuery,
  requireAdmin,
} from "@/server/http/api-helpers";
import { RATE_LIMITS } from "@/server/http/rate-limit";
import { adminReportsQuerySchema } from "@/lib/validation/user-schemas";
import { listReports } from "@/server/services/adminService";

/** GET /api/admin/reports?limit&offset&status=open|resolved|dismissed|all → AdminPage<AdminReport> */
export async function GET(request: NextRequest) {
  try {
    const { session, error } = await requireAdmin();
    if (error) return error;
    const rl = enforceRateLimit(request, "admin:reports", RATE_LIMITS.admin, session.user.id);
    if (rl) return rl;
    const q = parseQuery(request, adminReportsQuerySchema);
    if (q.error) return q.error;

    return json(await listReports(q.data));
  } catch (error) {
    return handleRouteError(error, "GET /api/admin/reports");
  }
}
