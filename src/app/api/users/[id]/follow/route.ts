import { NextRequest } from "next/server";
import {
  checkCsrfOrigin,
  enforceRateLimit,
  handleRouteError,
  json,
  parseParams,
  requireSession,
} from "@/server/http/api-helpers";
import { RATE_LIMITS } from "@/server/http/rate-limit";
import { idParamSchema } from "@/lib/validation/user-schemas";
import { followUser, unfollowUser } from "@/server/services/users";
import type { FollowStatusResponse } from "@/types/userTypes";

type Ctx = { params: Promise<{ id: string }> };

async function guard(request: NextRequest, ctx: Ctx, scope: string) {
  const csrf = checkCsrfOrigin(request);
  if (csrf) return { error: csrf } as const;
  const { session, error } = await requireSession();
  if (error) return { error } as const;
  const rl = enforceRateLimit(request, scope, RATE_LIMITS.write, session.user.id);
  if (rl) return { error: rl } as const;
  const p = parseParams(await ctx.params, idParamSchema);
  if (p.error) return { error: p.error } as const;
  return { error: null, userId: session.user.id, targetId: p.data.id } as const;
}

/** POST /api/users/:id/follow → { is_following: true } (idempotent) */
export async function POST(request: NextRequest, ctx: Ctx) {
  try {
    const g = await guard(request, ctx, "users:follow");
    if (g.error) return g.error;
    await followUser(g.userId, g.targetId);
    return json<FollowStatusResponse>({ is_following: true });
  } catch (error) {
    return handleRouteError(error, "POST /api/users/:id/follow");
  }
}

/** DELETE /api/users/:id/follow → { is_following: false } (idempotent) */
export async function DELETE(request: NextRequest, ctx: Ctx) {
  try {
    const g = await guard(request, ctx, "users:follow");
    if (g.error) return g.error;
    await unfollowUser(g.userId, g.targetId);
    return json<FollowStatusResponse>({ is_following: false });
  } catch (error) {
    return handleRouteError(error, "DELETE /api/users/:id/follow");
  }
}
