import "server-only";
import { db, sql } from "@/server/db";
import { toPaginated, type OffsetPagination } from "@/server/http/pagination";
import { invisibleUserIdsSql, toIso } from "@/server/services/pins/sql";
import type { NotificationItem, NotificationType, Paginated } from "@/types/api";

/**
 * In-app notification inbox (table `notifications`). Writers record events
 * through `recordNotifications`; unread events with the same group key
 * collapse into one row. Readers never see rows whose actor is deleted, or
 * whose actor or pin owner is invisible to them (blocked either way).
 */

/** Read rows older than this are pruned when the user marks things read. */
const READ_RETENTION = "90 days";
const SNIPPET_LENGTH = 140;

export function groupKey(type: NotificationType, targetId: string): string {
  return `${type}:${targetId}`;
}

export interface RecordedNotification {
  recipient_id: string;
  /** Distinct actors in the recipient's unread group, this one included. */
  count: number;
  /** True when this event claimed the push slot (see `pushCooldown`). */
  should_push: boolean;
}

/**
 * Record one event for many recipients. A recipient with an unread row for
 * the same group gets the actor added (once) and the new comment / time;
 * otherwise a fresh row is inserted. Deleted recipients, a deleted actor
 * and a vanished pin / comment are skipped.
 *
 * `should_push` is true when the actor is new to the group and no push for
 * this (recipient, group) went out within `pushCooldown` (Postgres
 * interval, default none) — read rows included, so reading doesn't reset
 * the throttle. The slot is claimed atomically.
 */
export async function recordNotifications(params: {
  recipientIds: string[];
  type: NotificationType;
  groupTargetId: string;
  actorId: string;
  pinId?: string | null;
  commentId?: string | null;
  pushCooldown?: string;
}): Promise<RecordedNotification[]> {
  const { type, actorId } = params;
  const candidates = [...new Set(params.recipientIds)].filter((id) => id !== actorId).sort();
  if (candidates.length === 0) return [];
  const key = groupKey(type, params.groupTargetId);
  const cooldown = params.pushCooldown ?? "0 seconds";
  const pinId = params.pinId ?? null;
  const commentId = params.commentId ?? null;
  const ids = (list: string[]) => sql.join(list.map((id) => sql`${id}`), sql`, `);

  return db.transaction(async (tx) => {
    // Lock order user → pin → comment → notification: deleteAccount locks
    // the user first and pin / comment deletes go pin → comment, so a
    // concurrent delete either waits for this insert or is seen here.
    const live = (await tx.execute(sql`
      SELECT id FROM "user"
      WHERE id IN (${ids([actorId, ...candidates])}) AND deleted_at IS NULL
      ORDER BY id
      FOR SHARE
    `)) as unknown as Array<{ id: string }>;
    const liveIds = new Set(live.map((r) => r.id));
    const recipients = candidates.filter((id) => liveIds.has(id));
    if (!liveIds.has(actorId) || recipients.length === 0) return [];
    if (pinId) {
      const pin = await tx.execute(sql`SELECT 1 FROM pins WHERE id = ${pinId} FOR KEY SHARE`);
      if (pin.length === 0) return [];
    }
    if (commentId) {
      const comment = await tx.execute(
        sql`SELECT 1 FROM comments WHERE id = ${commentId} FOR KEY SHARE`
      );
      if (comment.length === 0) return [];
    }

    const actorIds = sql`CASE WHEN EXCLUDED.actor_id = ANY(notifications.actor_ids)
      THEN notifications.actor_ids
      ELSE notifications.actor_ids || EXCLUDED.actor_id END`;
    const rows = (await tx.execute(sql`
      INSERT INTO notifications
        (id, recipient_id, type, group_key, actor_id, actor_ids, pin_id, comment_id, pushed_at)
      SELECT gen_random_uuid()::text, r.id, ${type}, ${key}, ${actorId}, ARRAY[${actorId}]::text[],
             ${pinId}, ${commentId},
             CASE WHEN EXISTS (
               SELECT 1 FROM notifications o
               WHERE o.recipient_id = r.id AND o.group_key = ${key}
                 AND o.pushed_at > now() - ${cooldown}::interval
             ) THEN NULL ELSE now() END
      FROM unnest(ARRAY[${ids(recipients)}]::text[]) AS r(id)
      ORDER BY r.id
      ON CONFLICT (recipient_id, group_key) WHERE read_at IS NULL DO UPDATE SET
        actor_ids = ${actorIds},
        count = cardinality(${actorIds}),
        actor_id = EXCLUDED.actor_id,
        comment_id = COALESCE(EXCLUDED.comment_id, notifications.comment_id),
        updated_at = now(),
        pushed_at = CASE
          WHEN EXCLUDED.actor_id <> ALL(notifications.actor_ids)
            AND EXCLUDED.pushed_at IS NOT NULL
          THEN now() ELSE notifications.pushed_at END
      RETURNING recipient_id, count, (pushed_at IS NOT DISTINCT FROM now()) AS should_push
    `)) as unknown as RecordedNotification[];
    return rows.map((r) => ({ ...r, count: Number(r.count) }));
  });
}

/**
 * Rows the viewer may see: live actor, neither actor nor pin owner
 * invisible to them (blocked either way, also when blocked after the
 * event); likes need their comment. Needs `JOIN "user" a` (actor) and
 * `LEFT JOIN pins p`.
 */
function visibleRowsSql(recipientId: string) {
  const invisible = invisibleUserIdsSql(recipientId);
  return sql`
    n.recipient_id = ${recipientId}
    AND a.deleted_at IS NULL
    AND n.actor_id NOT IN ${invisible}
    AND (p.user_id IS NULL OR p.user_id NOT IN ${invisible})
    AND NOT (n.type = 'comment_liked' AND n.comment_id IS NULL)`;
}

interface NotificationRow {
  id: string;
  type: NotificationType;
  count: number;
  read_at: string | Date | null;
  created_at: string | Date;
  updated_at: string | Date;
  actor_id: string;
  actor_display_name: string | null;
  actor_avatar_url: string | null;
  pin_id: string | null;
  pin_name: string | null;
  pin_lat: number | null;
  pin_lng: number | null;
  pin_is_mine: boolean | null;
  comment_id: string | null;
  comment_text: string | null;
}

function toNotificationItem(row: NotificationRow): NotificationItem {
  return {
    id: row.id,
    type: row.type,
    count: Number(row.count),
    read: row.read_at !== null,
    created_at: toIso(row.created_at),
    updated_at: toIso(row.updated_at),
    actor: {
      id: row.actor_id,
      display_name: row.actor_display_name ?? null,
      avatar_url: row.actor_avatar_url ?? null,
    },
    pin:
      row.pin_id && row.pin_name !== null
        ? {
            id: row.pin_id,
            name: row.pin_name,
            lat: Number(row.pin_lat),
            lng: Number(row.pin_lng),
            is_mine: !!row.pin_is_mine,
          }
        : null,
    comment:
      row.comment_id && row.comment_text !== null
        ? { id: row.comment_id, text: row.comment_text }
        : null,
  };
}

/** GET /api/notifications — newest activity first. */
export async function listNotifications(
  recipientId: string,
  page: OffsetPagination
): Promise<Paginated<NotificationItem>> {
  const rows = (await db.execute(sql`
    SELECT
      n.id, n.type, n.count, n.read_at, n.created_at, n.updated_at,
      a.id AS actor_id,
      COALESCE(a.display_name, a.name) AS actor_display_name,
      a.avatar_url AS actor_avatar_url,
      p.id AS pin_id, p.name AS pin_name,
      ST_Y(p.location) AS pin_lat, ST_X(p.location) AS pin_lng,
      (p.user_id = n.recipient_id) AS pin_is_mine,
      c.id AS comment_id, left(c.text, ${SNIPPET_LENGTH}) AS comment_text
    FROM notifications n
    JOIN "user" a ON a.id = n.actor_id
    LEFT JOIN pins p ON p.id = n.pin_id
    LEFT JOIN comments c ON c.id = n.comment_id
    WHERE ${visibleRowsSql(recipientId)}
    ORDER BY n.updated_at DESC, n.id
    LIMIT ${page.limit + 1} OFFSET ${page.offset}
  `)) as unknown as NotificationRow[];
  return toPaginated(rows.map(toNotificationItem), page);
}

/** Unread rows (groups, not events) — what the badge shows. */
export async function countUnreadNotifications(recipientId: string): Promise<number> {
  const [row] = (await db.execute(sql`
    SELECT count(*)::int AS n
    FROM notifications n
    JOIN "user" a ON a.id = n.actor_id
    LEFT JOIN pins p ON p.id = n.pin_id
    WHERE ${visibleRowsSql(recipientId)} AND n.read_at IS NULL
  `)) as unknown as Array<{ n: number }>;
  return Number(row?.n ?? 0);
}

/**
 * Mark the given rows (or all) as read, then prune old read rows of this
 * user. Unknown / foreign ids are ignored. With `seenUntil` (the newest
 * `updated_at` the client rendered) a row that got a new event since then
 * stays unread. Returns the new unread count.
 */
export async function markNotificationsRead(
  recipientId: string,
  ids: string[] | "all",
  seenUntil?: string
): Promise<number> {
  if (ids !== "all" && ids.length === 0) return countUnreadNotifications(recipientId);
  const idFilter =
    ids === "all" ? sql.empty() : sql` AND id IN (${sql.join(ids.map((id) => sql`${id}`), sql`, `)})`;
  // Clients see millisecond timestamps (toIso), Postgres keeps microseconds.
  const seenFilter = seenUntil
    ? sql` AND date_trunc('milliseconds', updated_at) <= ${seenUntil}::timestamptz`
    : sql.empty();

  await db.execute(sql`
    UPDATE notifications SET read_at = now()
    WHERE recipient_id = ${recipientId} AND read_at IS NULL ${idFilter} ${seenFilter}
  `);
  await db.execute(sql`
    DELETE FROM notifications
    WHERE recipient_id = ${recipientId}
      AND read_at IS NOT NULL
      AND read_at < now() - ${READ_RETENTION}::interval
  `);
  return countUnreadNotifications(recipientId);
}
