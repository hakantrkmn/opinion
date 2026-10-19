import { NextRequest } from "next/server";
import {
  checkCsrfOrigin,
  enforceRateLimit,
  handleRouteError,
  json,
  parseBody,
  requireSession,
} from "@/server/http/api-helpers";
import { RATE_LIMITS } from "@/server/http/rate-limit";
import { updateProfileSchema } from "@/lib/validation/user-schemas";
import {
  getOwnProfile,
  getUserStats,
  updateDisplayName,
} from "@/server/services/users";
import type { OwnProfileResponse, OwnUserProfile } from "@/types/userTypes";

/** GET /api/profile → { profile, stats } for the signed-in user. */
export async function GET(request: NextRequest) {
  try {
    const { session, error } = await requireSession();
    if (error) return error;
    const rl = enforceRateLimit(request, "profile:get", RATE_LIMITS.read, session.user.id);
    if (rl) return rl;

    const [profile, stats] = await Promise.all([
      getOwnProfile(session.user.id),
      getUserStats(session.user.id),
    ]);
    return json<OwnProfileResponse>({ profile, stats });
  } catch (error) {
    return handleRouteError(error, "GET /api/profile");
  }
}

/** PATCH /api/profile { display_name? } → { profile } */
export async function PATCH(request: NextRequest) {
  try {
    const csrf = checkCsrfOrigin(request);
    if (csrf) return csrf;
    const { session, error } = await requireSession();
    if (error) return error;
    const rl = enforceRateLimit(request, "profile:patch", RATE_LIMITS.write, session.user.id);
    if (rl) return rl;
    const body = await parseBody(request, updateProfileSchema);
    if (body.error) return body.error;

    let profile: OwnUserProfile;
    if (body.data.display_name !== undefined) {
      profile = await updateDisplayName(session.user.id, body.data.display_name);
    } else {
      profile = await getOwnProfile(session.user.id);
    }
    return json({ profile });
  } catch (error) {
    return handleRouteError(error, "PATCH /api/profile");
  }
}
