import "server-only";
import { db, sql } from "@/server/db";
import { pushService, type PushDevice } from "@/server/services/pushService";
import { isBlockedRelation } from "@/server/services/blocks";
import { recordNotifications } from "@/server/services/inbox";
import { pushCopy, recipientLocale } from "@/server/i18n/push-copy";
import type { Locale } from "@/i18n/config";

/**
 * Inbox rows and push notifications triggered by pin / comment activity.
 * Call these from `after()` so they never delay or fail the HTTP response;
 * every function here catches and logs its own errors.
 */

const LIKE_MILESTONES = new Set([5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000]);
const LIKE_NOTIFY_COOLDOWN = "1 hour";
/** At most one "new opinion" push per (recipient, pin) in this window. */
const PIN_COMMENT_PUSH_COOLDOWN = "1 hour";

function snippet(text: string, max = 80): string {
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

async function displayName(userId: string): Promise<string | null> {
  const [row] = (await db.execute(sql`
    SELECT COALESCE(display_name, name) AS name FROM "user" WHERE id = ${userId}
  `)) as unknown as Array<{ name: string | null }>;
  return row?.name || null;
}

/** Devices grouped by their owner's language (one message per language). */
function byLocale<T extends { locale: string | null }>(rows: T[]): Map<Locale, T[]> {
  const groups = new Map<Locale, T[]>();
  for (const row of rows) {
    const l = recipientLocale(row.locale);
    groups.set(l, [...(groups.get(l) ?? []), row]);
  }
  return groups;
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
      SELECT c.user_id, c.pin_id, c.text, c.likes_count, u.locale
      FROM comments c JOIN "user" u ON u.id = c.user_id
      WHERE c.id = ${commentId}
    `)) as unknown as Array<{
      user_id: string;
      pin_id: string;
      text: string;
      likes_count: number;
      locale: string | null;
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

    // Inbox: every first like by a user counts; the push below is rarer.
    await recordNotifications({
      recipientIds: [comment.user_id],
      type: "comment_liked",
      groupTargetId: commentId,
      actorId: likerId,
      pinId: comment.pin_id,
      commentId,
    });

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

    const devices = await pushService.getActiveDevicesForUser(comment.user_id);
    if (devices.length === 0) return;

    await pushService.sendToDevices(devices, {
      title: pushCopy.commentLiked(recipientLocale(comment.locale), await displayName(likerId), likes),
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
      SELECT DISTINCT t.token, t.platform, fu.locale
      FROM user_follows f
      JOIN push_tokens t ON t.user_id = f.follower_id AND t.is_active
      JOIN "user" fu ON fu.id = f.follower_id AND fu.deleted_at IS NULL
      WHERE f.following_id = ${params.authorId}
        AND NOT EXISTS (
          SELECT 1 FROM user_blocks b
          WHERE (b.blocker_id = f.follower_id AND b.blocked_id = f.following_id)
             OR (b.blocker_id = f.following_id AND b.blocked_id = f.follower_id)
        )
    `)) as unknown as Array<PushDevice & { locale: string | null }>;
    if (rows.length === 0) return;

    const author = await displayName(params.authorId);
    await Promise.all(
      [...byLocale(rows)].map(([locale, devices]) =>
        pushService.sendToDevices(devices, {
          title: pushCopy.followedUserPin(locale, author),
          body: params.pinName,
          data: {
            type: "followed_user_pin",
            authorId: params.authorId,
            pinId: params.pinId,
            pinName: params.pinName,
            latitude: params.lat,
            longitude: params.lng,
          },
        })
      )
    );
  } catch (error) {
    console.error("[notifyFollowersOfNewPin]", params.pinId, error);
  }
}

/**
 * "X shared an opinion on your pin / on a pin you commented on". Called
 * after a comment was created. Recipients: the pin owner and everyone who
 * commented on the pin before, minus the commenter, deleted users and
 * anyone with a block relation (either way) to the commenter or the owner. Each gets one grouped
 * inbox row per pin; the push is throttled per (recipient, pin).
 */
export async function notifyPinCommented(params: {
  pinId: string;
  commentId: string;
  commenterId: string;
}): Promise<void> {
  const { pinId, commentId, commenterId } = params;
  try {
    const [ctx] = (await db.execute(sql`
      SELECT p.user_id AS owner_id, p.name AS pin_name, c.text
      FROM pins p JOIN comments c ON c.id = ${commentId} AND c.pin_id = p.id
      WHERE p.id = ${pinId}
    `)) as unknown as Array<{ owner_id: string; pin_name: string; text: string }>;
    if (!ctx) return; // comment or pin deleted in the meantime

    const recipients = (await db.execute(sql`
      SELECT r.user_id
      FROM (
        SELECT ${ctx.owner_id}::text AS user_id
        UNION
        SELECT c.user_id FROM comments c WHERE c.pin_id = ${pinId}
      ) r
      JOIN "user" u ON u.id = r.user_id AND u.deleted_at IS NULL
      WHERE r.user_id <> ${commenterId}
        -- Neither the commenter nor the pin owner may be blocked with the
        -- recipient (the pin would be hidden from them).
        AND NOT EXISTS (
          SELECT 1 FROM user_blocks b
          WHERE (b.blocker_id = r.user_id AND b.blocked_id IN (${commenterId}, ${ctx.owner_id}))
             OR (b.blocked_id = r.user_id AND b.blocker_id IN (${commenterId}, ${ctx.owner_id}))
        )
    `)) as unknown as Array<{ user_id: string }>;
    if (recipients.length === 0) return;

    const recorded = await recordNotifications({
      recipientIds: recipients.map((r) => r.user_id),
      type: "pin_commented",
      groupTargetId: pinId,
      actorId: commenterId,
      pinId,
      commentId,
      pushCooldown: PIN_COMMENT_PUSH_COOLDOWN,
    });
    const toPush = recorded.filter((r) => r.should_push);
    if (toPush.length === 0) return;

    const devices = (await db.execute(sql`
      SELECT t.user_id, t.token, t.platform, u.locale
      FROM push_tokens t
      JOIN "user" u ON u.id = t.user_id
      WHERE t.is_active AND t.user_id IN (${sql.join(
        toPush.map((r) => sql`${r.recipient_id}`),
        sql`, `
      )})
    `)) as unknown as Array<PushDevice & { user_id: string; locale: string | null }>;
    if (devices.length === 0) return;

    const name = await displayName(commenterId);
    const body = snippet(ctx.text);
    await Promise.all(
      toPush.map((r) => {
        const mine = devices.filter((d) => d.user_id === r.recipient_id);
        if (mine.length === 0) return null;
        const isOwner = r.recipient_id === ctx.owner_id;
        const locale = recipientLocale(mine[0].locale);
        return pushService.sendToDevices(mine, {
          title: isOwner
            ? pushCopy.pinCommentedOwner(locale, name, r.count)
            : pushCopy.pinCommentedOthers(locale, snippet(ctx.pin_name, 40)),
          body: isOwner
            ? `${snippet(ctx.pin_name, 40)} · ${body}`
            : `${name ?? pushCopy.someone(locale)}: ${body}`,
          data: {
            type: "pin_comment",
            pinId,
            commentId,
            commenterId,
            count: r.count,
          },
        });
      })
    );
  } catch (error) {
    console.error("[notifyPinCommented]", params, error);
  }
}
