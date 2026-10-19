import "server-only";
import { and, desc, eq, or } from "drizzle-orm";
import { db } from "@/server/db";
import { userBlocks, userFollows } from "@/server/db/schema/app";
import { user } from "@/server/db/schema/auth";
import { HttpError } from "@/server/http/api-helpers";
import { toPaginated, type OffsetPagination } from "@/server/http/pagination";
import { isoRequired, toUserSummary } from "@/server/services/users/mappers";
import type { Paginated } from "@/types/api";
import type { BlockedUser } from "@/types/userTypes";

export async function getBlockedUserIds(userId: string | null): Promise<string[]> {
  if (!userId) return [];
  const rows = await db
    .select({ blockedId: userBlocks.blockedId })
    .from(userBlocks)
    .where(eq(userBlocks.blockerId, userId));
  return rows.map((r) => r.blockedId);
}

// Bidirectional invisibility: A blocked B OR B blocked A. Either side
// removes the other's content from view.
export async function getInvisibleUserIds(userId: string | null): Promise<string[]> {
  if (!userId) return [];
  const rows = await db
    .select({
      blockerId: userBlocks.blockerId,
      blockedId: userBlocks.blockedId,
    })
    .from(userBlocks)
    .where(
      or(eq(userBlocks.blockerId, userId), eq(userBlocks.blockedId, userId))
    );

  const ids = new Set<string>();
  for (const row of rows) {
    if (row.blockerId === userId) ids.add(row.blockedId);
    else ids.add(row.blockerId);
  }
  return Array.from(ids);
}

export async function isBlockedRelation(
  viewerId: string | null,
  otherId: string
): Promise<boolean> {
  if (!viewerId) return false;
  if (viewerId === otherId) return false;
  const rows = await db
    .select({ blockerId: userBlocks.blockerId })
    .from(userBlocks)
    .where(
      or(
        and(
          eq(userBlocks.blockerId, viewerId),
          eq(userBlocks.blockedId, otherId)
        ),
        and(
          eq(userBlocks.blockerId, otherId),
          eq(userBlocks.blockedId, viewerId)
        )
      )
    )
    .limit(1);
  return rows.length > 0;
}

/**
 * Block `blockedId`. Idempotent. Also removes follows in both directions so
 * neither side keeps seeing the other's content in "following" feeds.
 */
export async function blockUser(blockerId: string, blockedId: string) {
  if (blockerId === blockedId) {
    throw HttpError.badRequest("You cannot block yourself");
  }
  const [target] = await db
    .select({ id: user.id })
    .from(user)
    .where(eq(user.id, blockedId))
    .limit(1);
  if (!target) throw HttpError.notFound("User not found");

  await db.transaction(async (tx) => {
    await tx
      .insert(userBlocks)
      .values({ blockerId, blockedId })
      .onConflictDoNothing({ target: [userBlocks.blockerId, userBlocks.blockedId] });
    await tx
      .delete(userFollows)
      .where(
        or(
          and(eq(userFollows.followerId, blockerId), eq(userFollows.followingId, blockedId)),
          and(eq(userFollows.followerId, blockedId), eq(userFollows.followingId, blockerId))
        )
      );
  });
}

/** Idempotent. */
export async function unblockUser(blockerId: string, blockedId: string) {
  await db
    .delete(userBlocks)
    .where(and(eq(userBlocks.blockerId, blockerId), eq(userBlocks.blockedId, blockedId)));
}

export async function hasBlocked(blockerId: string, blockedId: string) {
  const [row] = await db
    .select({ id: userBlocks.blockedId })
    .from(userBlocks)
    .where(and(eq(userBlocks.blockerId, blockerId), eq(userBlocks.blockedId, blockedId)))
    .limit(1);
  return !!row;
}

/** Users blocked BY `userId`, most recent first. */
export async function listBlockedUsers(
  userId: string,
  page: OffsetPagination
): Promise<Paginated<BlockedUser>> {
  const rows = await db
    .select({
      id: user.id,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      deletedAt: user.deletedAt,
      blockedAt: userBlocks.createdAt,
    })
    .from(userBlocks)
    .innerJoin(user, eq(user.id, userBlocks.blockedId))
    .where(eq(userBlocks.blockerId, userId))
    .orderBy(desc(userBlocks.createdAt), desc(user.id))
    .limit(page.limit + 1)
    .offset(page.offset);

  return toPaginated(
    rows.map((r) => ({ ...toUserSummary(r), blocked_at: isoRequired(r.blockedAt) })),
    page
  );
}
