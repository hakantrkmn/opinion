import "server-only";
import { db, sql } from "@/server/db";
import { pushService } from "@/server/services/pushService";
import { isBlockedRelation } from "@/server/services/blocks";

/**
 * Push notifications triggered by pin / comment activity. Call these from
 * `after()` so they never delay or fail the HTTP response; every function
 * here catches and logs its own errors.
 */

const LIKE_MILESTONES = new Set([5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000]);
const LIKE_NOTIFY_COOLDOWN = "1 hour";

function snippet(text: string, max = 80): string {
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

/**
 * "X liked your comment". Called after a vote transitioned to +1.
 *  - never for self-likes or when author and liker are blocked either way,
 *  - at most once per (comment, liker) ever (comment_like_notifications),
 *  - for a comment: on its first like and on milestones, at most once per
 *    cooldown window; the slot is claimed atomically before sending.
 */
export async function notifyCommentLiked(params: {
  commentId: string;
  likerId: string;
}): Promise<void> {
  const { commentId, likerId } = params;
  try {
    const [comment] = (await db.execute(sql`
      SELECT c.user_id, c.pin_id, c.text, c.likes_count
      FROM comments c WHERE c.id = ${commentId}
    `)) as unknown as Array<{
      user_id: string;
      pin_id: string;
      text: string;
      likes_count: number;
    }>;
    if (!comment || comment.user_id === likerId) return;
    if (await isBlockedRelation(likerId, comment.user_id)) return;

    // Per-(comment, liker) dedupe: only the first like by this user counts.
    const claimedPair = await db.execute(sql`
      INSERT INTO comment_like_notifications (comment_id, liker_id)
      VALUES (${commentId}, ${likerId})
      ON CONFLICT DO NOTHING
      RETURNING comment_id
    `);
    if (claimedPair.length === 0) return;

    const likes = Number(comment.likes_count);
    if (likes !== 1 && !LIKE_MILESTONES.has(likes)) return;

    // Per-comment cooldown + milestone monotonicity, claimed atomically.
    const claimed = await db.execute(sql`
      UPDATE comments
      SET like_notified_count = ${likes}, like_notified_at = now()
      WHERE id = ${commentId}
        AND (like_notified_at IS NULL OR like_notified_at < now() - ${LIKE_NOTIFY_COOLDOWN}::interval)
        AND (${likes} = 1 OR like_notified_count < ${likes})
      RETURNING id
    `);
    if (claimed.length === 0) return;

    const tokens = await pushService.getActiveTokensForUser(comment.user_id);
    if (tokens.length === 0) return;

    const [liker] = (await db.execute(sql`
      SELECT COALESCE(display_name, name) AS name FROM "user" WHERE id = ${likerId}
    `)) as unknown as Array<{ name: string | null }>;
    const likerName = liker?.name || "Someone";
    const others = likes - 1;
    const title =
      others <= 0
        ? `${likerName} liked your comment`
        : others === 1
          ? `${likerName} and 1 other liked your comment`
          : `${likerName} and ${others} others liked your comment`;

    await pushService.sendToTokens(tokens, {
      title,
      body: snippet(comment.text),
      data: {
        type: "comment_like",
        commentId,
        pinId: comment.pin_id,
        count: likes,
        voterId: likerId,
      },
    });
  } catch (error) {
    console.error("[notifyCommentLiked]", { commentId, likerId }, error);
  }
}

/**
 * "X dropped a new pin" to every follower of the author with an active push
 * token, skipping deleted users and blocked relations — one query.
 */
export async function notifyFollowersOfNewPin(params: {
  authorId: string;
  pinId: string;
  pinName: string;
  lat: number;
  lng: number;
}): Promise<void> {
  try {
    const rows = (await db.execute(sql`
      SELECT DISTINCT t.token
      FROM user_follows f
      JOIN push_tokens t ON t.user_id = f.follower_id AND t.is_active
      JOIN "user" fu ON fu.id = f.follower_id AND fu.deleted_at IS NULL
      WHERE f.following_id = ${params.authorId}
        AND NOT EXISTS (
          SELECT 1 FROM user_blocks b
          WHERE (b.blocker_id = f.follower_id AND b.blocked_id = f.following_id)
             OR (b.blocker_id = f.following_id AND b.blocked_id = f.follower_id)
        )
    `)) as unknown as Array<{ token: string }>;
    if (rows.length === 0) return;

    const [author] = (await db.execute(sql`
      SELECT COALESCE(display_name, name) AS name FROM "user" WHERE id = ${params.authorId}
    `)) as unknown as Array<{ name: string | null }>;

    await pushService.sendToTokens(
      rows.map((r) => r.token),
      {
        title: `${author?.name || "Birisi"} yeni bir pin bıraktı`,
        body: params.pinName,
        data: {
          type: "followed_user_pin",
          authorId: params.authorId,
          pinId: params.pinId,
          pinName: params.pinName,
          latitude: params.lat,
          longitude: params.lng,
        },
      }
    );
  } catch (error) {
    console.error("[notifyFollowersOfNewPin]", params.pinId, error);
  }
}
