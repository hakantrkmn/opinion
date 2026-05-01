import { NextRequest } from "next/server";
import { and, desc, eq, or } from "drizzle-orm";
import { db } from "@/db";
import { userBlocks, userFollows } from "@/db/schema/app";
import { user } from "@/db/schema/auth";
import {
  ApiErrorCode,
  errorResponse,
  json,
  parseBody,
  parseQuery,
  requireSession,
  enforceRateLimit,
  checkCsrfOrigin,
} from "@/lib/api-helpers";
import { blockUserSchema, unblockUserQuerySchema } from "@/lib/validation/schemas";
import { RATE_LIMITS } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  try {
    const csrf = checkCsrfOrigin(request);
    if (csrf) return csrf;

    const { session, error: authError } = await requireSession();
    if (authError) return authError;

    const rl = enforceRateLimit(
      request,
      "blocks:post",
      RATE_LIMITS.write,
      session.user.id
    );
    if (rl) return rl;

    const parsed = await parseBody(request, blockUserSchema);
    if (parsed.error) return parsed.error;

    const blockerId = session.user.id;
    const { blockedId } = parsed.data;

    if (blockerId === blockedId) {
      return errorResponse(
        400,
        ApiErrorCode.BAD_REQUEST,
        "You cannot block yourself"
      );
    }

    const [target] = await db
      .select({ id: user.id })
      .from(user)
      .where(eq(user.id, blockedId))
      .limit(1);
    if (!target)
      return errorResponse(404, ApiErrorCode.NOT_FOUND, "User not found");

    await db.transaction(async (tx) => {
      await tx
        .insert(userBlocks)
        .values({ blockerId, blockedId })
        .onConflictDoNothing({
          target: [userBlocks.blockerId, userBlocks.blockedId],
        });

      // Tear down any follow relationship in either direction.
      await tx
        .delete(userFollows)
        .where(
          or(
            and(
              eq(userFollows.followerId, blockerId),
              eq(userFollows.followingId, blockedId)
            ),
            and(
              eq(userFollows.followerId, blockedId),
              eq(userFollows.followingId, blockerId)
            )
          )
        );
    });

    return json({ ok: true });
  } catch (err) {
    console.error("Blocks POST error:", err);
    return errorResponse(
      500,
      ApiErrorCode.INTERNAL_ERROR,
      "Failed to block user"
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const csrf = checkCsrfOrigin(request);
    if (csrf) return csrf;

    const { session, error: authError } = await requireSession();
    if (authError) return authError;

    const rl = enforceRateLimit(
      request,
      "blocks:delete",
      RATE_LIMITS.write,
      session.user.id
    );
    if (rl) return rl;

    const parsed = parseQuery(request, unblockUserQuerySchema);
    if (parsed.error) return parsed.error;

    await db
      .delete(userBlocks)
      .where(
        and(
          eq(userBlocks.blockerId, session.user.id),
          eq(userBlocks.blockedId, parsed.data.blockedId)
        )
      );

    return json({ ok: true });
  } catch (err) {
    console.error("Blocks DELETE error:", err);
    return errorResponse(
      500,
      ApiErrorCode.INTERNAL_ERROR,
      "Failed to unblock user"
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { session, error: authError } = await requireSession();
    if (authError) return authError;

    const rl = enforceRateLimit(
      request,
      "blocks:get",
      RATE_LIMITS.read,
      session.user.id
    );
    if (rl) return rl;

    const rows = await db
      .select({
        id: user.id,
        displayName: user.displayName,
        name: user.name,
        avatarUrl: user.avatarUrl,
        image: user.image,
        createdAt: userBlocks.createdAt,
      })
      .from(userBlocks)
      .innerJoin(user, eq(user.id, userBlocks.blockedId))
      .where(eq(userBlocks.blockerId, session.user.id))
      .orderBy(desc(userBlocks.createdAt));

    return json({ data: rows });
  } catch (err) {
    console.error("Blocks GET error:", err);
    return errorResponse(
      500,
      ApiErrorCode.INTERNAL_ERROR,
      "Failed to load blocks"
    );
  }
}
