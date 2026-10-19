import { NextRequest } from "next/server";
import {
  enforceRateLimit,
  handleRouteError,
  json,
  parseQuery,
  requireAdmin,
} from "@/server/http/api-helpers";
import { RATE_LIMITS } from "@/server/http/rate-limit";
import { adminListQuerySchema } from "@/lib/validation/user-schemas";
import { listPins } from "@/server/services/adminService";

/** GET /api/admin/pins?limit&offset&q → AdminPage<AdminPin> */
export async function GET(request: NextRequest) {
  try {
    const { session, error } = await requireAdmin();
    if (error) return error;
    const rl = enforceRateLimit(request, "admin:pins", RATE_LIMITS.admin, session.user.id);
    if (rl) return rl;
    const q = parseQuery(request, adminListQuerySchema);
    if (q.error) return q.error;

    return json(await listPins(q.data));
  } catch (error) {
    return handleRouteError(error, "GET /api/admin/pins");
  }
}
