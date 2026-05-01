import { and, eq, or } from "drizzle-orm";
import { db } from "@/db";
import { userBlocks } from "@/db/schema/app";

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
