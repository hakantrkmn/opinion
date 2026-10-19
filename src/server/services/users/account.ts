import "server-only";
import { rm } from "fs/promises";
import { join } from "path";
import { eq, or, sql } from "drizzle-orm";
import { db } from "@/server/db";
import { account, session, user } from "@/server/db/schema/auth";
import {
  comments,
  commentVotes,
  pushTokens,
  reports,
  userBlocks,
  userFollows,
} from "@/server/db/schema/app";
import { UPLOAD_DIR } from "@/server/storage";
import { deleteUploadByUrl, type UploadFolder } from "@/server/uploads";

const SAFE_ID = /^[a-zA-Z0-9_-]{1,64}$/;

/**
 * Soft-delete a user account. Used both for self-deletion and for admin
 * deletion ("ban").
 *
 * - Removes the user's votes, comments (and their photos), follows, blocks,
 *   filed reports, push tokens, sessions and credentials.
 * - Pins left without comments are removed by the comment-deletion trigger;
 *   pins that still have other people's comments stay, shown with an
 *   anonymous author (display_name null).
 * - The user row is kept (deleted_at set) with PII scrubbed so foreign keys
 *   and audit logs stay valid. The email is freed for re-registration.
 *
 * Idempotent: deleting an already-deleted user is a no-op.
 * Returns false when the user does not exist.
 */
export async function deleteAccount(userId: string): Promise<boolean> {
  const [existing] = await db
    .select({ id: user.id, avatarUrl: user.avatarUrl, deletedAt: user.deletedAt })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);
  if (!existing) return false;
  if (existing.deletedAt) return true;

  const photoRows = await db
    .select({ photoUrl: comments.photoUrl })
    .from(comments)
    .where(eq(comments.userId, userId));

  await db.transaction(async (tx) => {
    // Lock affected pins first (pin → comment order, see lockPinOfComment).
    await tx.execute(sql`
      SELECT 1 FROM pins
      WHERE id IN (SELECT pin_id FROM comments WHERE user_id = ${userId})
      ORDER BY id
      FOR NO KEY UPDATE
    `);
    await tx.delete(commentVotes).where(eq(commentVotes.userId, userId));
    await tx.delete(comments).where(eq(comments.userId, userId));
    await tx
      .delete(userFollows)
      .where(
        or(eq(userFollows.followerId, userId), eq(userFollows.followingId, userId))
      );
    await tx
      .delete(userBlocks)
      .where(or(eq(userBlocks.blockerId, userId), eq(userBlocks.blockedId, userId)));
    await tx.delete(reports).where(eq(reports.reporterId, userId));
    await tx.delete(pushTokens).where(eq(pushTokens.userId, userId));
    await tx.delete(session).where(eq(session.userId, userId));
    await tx.delete(account).where(eq(account.userId, userId));
    await tx
      .update(user)
      .set({
        deletedAt: new Date(),
        email: `deleted-${userId}@deleted.invalid`,
        emailVerified: false,
        name: "Deleted user",
        displayName: null,
        avatarUrl: null,
        image: null,
        role: "user",
        updatedAt: new Date(),
      })
      .where(eq(user.id, userId));
  });

  // File cleanup happens after the commit; failures are logged, not fatal.
  await Promise.all([
    ...photoRows.map((r) => deleteUploadByUrl(r.photoUrl)),
    deleteUploadByUrl(existing.avatarUrl),
  ]);
  if (SAFE_ID.test(userId)) {
    const folders: UploadFolder[] = ["comment-photos", "avatars"];
    await Promise.all(
      folders.map((folder) =>
        rm(join(UPLOAD_DIR, folder, userId), { recursive: true, force: true }).catch(
          (error) => console.error("deleteAccount: folder cleanup failed", error)
        )
      )
    );
  }
  return true;
}
