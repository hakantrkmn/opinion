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
import { blockUser, unblockUser } from "@/server/services/blocks";
import type { BlockStatusResponse } from "@/types/userTypes";

type Ctx = { params: Promise<{ id: string }> };

async function guard(request: NextRequest, ctx: Ctx) {
  const csrf = checkCsrfOrigin(request);
  if (csrf) return { error: csrf } as const;
  const { session, error } = await requireSession();
  if (error) return { error } as const;
  const rl = enforceRateLimit(request, "users:block", RATE_LIMITS.write, session.user.id);
  if (rl) return { error: rl } as const;
  const p = parseParams(await ctx.params, idParamSchema);
  if (p.error) return { error: p.error } as const;
  return { error: null, userId: session.user.id, targetId: p.data.id } as const;
}

/**
 * POST /api/users/:id/block → { is_blocked: true } (idempotent).
 * Also removes follows in both directions.
 */
export async function POST(request: NextRequest, ctx: Ctx) {
  try {
    const g = await guard(request, ctx);
    if (g.error) return g.error;
    await blockUser(g.userId, g.targetId);
    return json<BlockStatusResponse>({ is_blocked: true });
  } catch (error) {
    return handleRouteError(error, "POST /api/users/:id/block");
  }
}

/** DELETE /api/users/:id/block → { is_blocked: false } (idempotent) */
export async function DELETE(request: NextRequest, ctx: Ctx) {
  try {
    const g = await guard(request, ctx);
    if (g.error) return g.error;
    await unblockUser(g.userId, g.targetId);
    return json<BlockStatusResponse>({ is_blocked: false });
  } catch (error) {
    return handleRouteError(error, "DELETE /api/users/:id/block");
  }
}
