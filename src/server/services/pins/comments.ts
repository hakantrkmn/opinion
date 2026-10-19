import "server-only";
import { db, sql } from "@/server/db";
import type {
  CommentItem,
  CommentSort,
  DeleteCommentResponse,
  PinCommentsResponse,
} from "@/types/api";
import { deleteUploadByUrl, isOwnedUploadUrl, resolveUploadPath } from "@/server/uploads";
import { isBlockedRelation } from "@/server/services/blocks";
import {
  commentColumnsSql,
  toCommentItem,
  visibleToViewerSql,
  type CommentRow,
} from "./sql";
import {
  notFound,
  pgErrorCode,
  PG_FOREIGN_KEY_VIOLATION,
  PG_UNIQUE_VIOLATION,
} from "./errors";
import { HttpError } from "@/server/http/api-helpers";
import type { SQL } from "drizzle-orm";

const ORDER_BY: Record<CommentSort, SQL> = {
  popular: sql`(c.likes_count - c.dislikes_count) DESC, c.likes_count DESC, c.created_at DESC, c.id`,
  newest: sql`c.created_at DESC, c.id`,
  oldest: sql`c.created_at ASC, c.id`,
};

function myVoteSql(viewerId: string | null): { column: SQL; join: SQL } {
  if (!viewerId) return { column: sql`0 AS my_vote`, join: sql.empty() };
  return {
    column: sql`COALESCE(v.value, 0) AS my_vote`,
    join: sql`LEFT JOIN comment_votes v ON v.comment_id = c.id AND v.user_id = ${viewerId}`,
  };
}

/** One comment as the viewer sees it (no visibility filtering). */
export async function getCommentItem(
  commentId: string,
  viewerId: string | null
): Promise<CommentItem | null> {
  const mv = myVoteSql(viewerId);
  const [row] = (await db.execute(sql`
    SELECT ${commentColumnsSql}, ${mv.column}
    FROM comments c
    JOIN "user" u ON u.id = c.user_id
    ${mv.join}
    WHERE c.id = ${commentId}
  `)) as unknown as CommentRow[];
  return row ? toCommentItem(row) : null;
}

/**
 * GET /api/pins/:id/comments. Comments by users invisible to the viewer are
 * filtered out (and not counted in `total`). Voter identities are never
 * exposed: only counters and the viewer's own vote.
 */
export async function listPinComments(params: {
  pinId: string;
  viewerId: string | null;
  sort: CommentSort;
  limit: number;
  offset: number;
}): Promise<PinCommentsResponse> {
  const { pinId, viewerId, sort, limit, offset } = params;
  const visible = visibleToViewerSql(sql`c.user_id`, viewerId);
  const mv = myVoteSql(viewerId);

  const [meta, rows] = await Promise.all([
    db.execute(sql`
      SELECT
        (SELECT count(*)::int FROM comments c WHERE c.pin_id = p.id ${visible}) AS total,
        ${
          viewerId
            ? sql`(SELECT c.id FROM comments c WHERE c.pin_id = p.id AND c.user_id = ${viewerId})`
            : sql`NULL::text`
        } AS my_comment_id
      FROM pins p
      WHERE p.id = ${pinId}
        ${visibleToViewerSql(sql`p.user_id`, viewerId)}
    `) as unknown as Promise<Array<{ total: number; my_comment_id: string | null }>>,
    db.execute(sql`
      SELECT ${commentColumnsSql}, ${mv.column}
      FROM comments c
      JOIN "user" u ON u.id = c.user_id
      ${mv.join}
      WHERE c.pin_id = ${pinId} ${visible}
      ORDER BY ${ORDER_BY[sort]}
      LIMIT ${limit + 1} OFFSET ${offset}
    `) as unknown as Promise<CommentRow[]>,
  ]);

  if (meta.length === 0) throw notFound("Pin");
  const hasMore = rows.length > limit;
  return {
    comments: (hasMore ? rows.slice(0, limit) : rows).map(toCommentItem),
    has_more: hasMore,
    total: Number(meta[0].total),
    my_comment_id: meta[0].my_comment_id ?? null,
  };
}

/** Width/height/format/size of an uploaded photo, read from the file itself. */
async function readPhotoMetadata(url: string): Promise<Record<string, unknown>> {
  const path = resolveUploadPath(url);
  if (!path) return {};
  try {
    const [{ default: sharp }, { stat }] = await Promise.all([
      import("sharp"),
      import("fs/promises"),
    ]);
    const [meta, info] = await Promise.all([sharp(path).metadata(), stat(path)]);
    return {
      width: meta.width ?? 0,
      height: meta.height ?? 0,
      format: meta.format ?? "webp",
      file_size: info.size,
    };
  } catch (error) {
    console.error("[readPhotoMetadata]", url, error);
    throw new HttpError(400, "VALIDATION_ERROR", "photo_url does not point to a readable image");
  }
}

function assertOwnedPhoto(url: string, userId: string) {
  if (!isOwnedUploadUrl(url, userId, "comment-photos")) {
    throw new HttpError(
      400,
      "VALIDATION_ERROR",
      "photo_url must be a comment photo uploaded by you (POST /api/upload)"
    );
  }
}

/** POST /api/pins/:id/comments */
export async function createComment(params: {
  pinId: string;
  userId: string;
  text: string;
  photoUrl?: string | null;
}): Promise<CommentItem> {
  const { pinId, userId, text } = params;
  const photoUrl = params.photoUrl || null;
  if (photoUrl) assertOwnedPhoto(photoUrl, userId);

  const [pin] = (await db.execute(sql`
    SELECT user_id FROM pins WHERE id = ${pinId}
  `)) as unknown as Array<{ user_id: string }>;
  if (!pin) throw notFound("Pin");
  if (await isBlockedRelation(userId, pin.user_id)) {
    throw HttpError.forbidden("You cannot comment on this pin");
  }

  const photoMetadata = photoUrl ? await readPhotoMetadata(photoUrl) : null;
  const id = crypto.randomUUID();
  try {
    await db.execute(sql`
      INSERT INTO comments (id, pin_id, user_id, text, photo_url, photo_metadata)
      VALUES (${id}, ${pinId}, ${userId}, ${text}, ${photoUrl},
              ${photoMetadata ? JSON.stringify(photoMetadata) : null}::jsonb)
    `);
  } catch (error) {
    const code = pgErrorCode(error);
    if (code === PG_UNIQUE_VIOLATION) {
      throw HttpError.conflict("You already commented on this pin");
    }
    // Pin deleted concurrently (its last comment was removed).
    if (code === PG_FOREIGN_KEY_VIOLATION) throw notFound("Pin");
    throw error;
  }

  const item = await getCommentItem(id, userId);
  if (!item) throw notFound("Comment");
  return item;
}

/** PATCH /api/comments/:id — owner only (404 otherwise). */
export async function updateComment(params: {
  commentId: string;
  userId: string;
  text?: string;
  /** undefined = keep, null = remove, string = replace */
  photoUrl?: string | null;
}): Promise<CommentItem> {
  const { commentId, userId, text, photoUrl } = params;
  if (photoUrl) assertOwnedPhoto(photoUrl, userId);
  const photoMetadata = photoUrl ? await readPhotoMetadata(photoUrl) : null;

  const oldPhoto = await db.transaction(async (tx) => {
    const [current] = (await tx.execute(sql`
      SELECT photo_url FROM comments
      WHERE id = ${commentId} AND user_id = ${userId}
      FOR UPDATE
    `)) as unknown as Array<{ photo_url: string | null }>;
    if (!current) throw notFound("Comment");

    const sets: SQL[] = [];
    if (text !== undefined) sets.push(sql`text = ${text}`);
    if (photoUrl !== undefined) {
      sets.push(sql`photo_url = ${photoUrl}`);
      sets.push(
        sql`photo_metadata = ${photoMetadata ? JSON.stringify(photoMetadata) : null}::jsonb`
      );
    }
    await tx.execute(sql`
      UPDATE comments SET ${sql.join(sets, sql`, `)}, updated_at = now()
      WHERE id = ${commentId}
    `);
    return current.photo_url;
  });

  // Remove the replaced/removed file only once the new state is committed.
  if (photoUrl !== undefined && oldPhoto && oldPhoto !== photoUrl) {
    await deleteUploadByUrl(oldPhoto);
  }

  const item = await getCommentItem(commentId, userId);
  if (!item) throw notFound("Comment");
  return item;
}

/**
 * DELETE /api/comments/:id — owner only (404 otherwise). If it was the last
 * comment the pin is deleted by trigger; `pin_deleted` reports that.
 */
export async function deleteComment(params: {
  commentId: string;
  userId: string;
}): Promise<DeleteCommentResponse> {
  const { commentId, userId } = params;
  const result = await db.transaction(async (tx) => {
    // Lock order pin → comment (same as deletePin / addComment) so a
    // concurrent pin delete can't deadlock with the comments_after_delete
    // trigger updating pins.comments_count.
    await lockPinOfComment(tx, commentId);
    const [deleted] = (await tx.execute(sql`
      DELETE FROM comments
      WHERE id = ${commentId} AND user_id = ${userId}
      RETURNING pin_id, photo_url
    `)) as unknown as Array<{ pin_id: string; photo_url: string | null }>;
    if (!deleted) throw notFound("Comment");
    const stillThere = await tx.execute(sql`SELECT 1 FROM pins WHERE id = ${deleted.pin_id}`);
    return { ...deleted, pinDeleted: stillThere.length === 0 };
  });

  await deleteUploadByUrl(result.photo_url);
  return { pin_deleted: result.pinDeleted, pin_id: result.pin_id };
}

/** Lock the parent pin of a comment before touching the comment row. */
export async function lockPinOfComment(
  tx: Pick<typeof db, "execute">,
  commentId: string
): Promise<void> {
  await tx.execute(sql`
    SELECT 1 FROM pins
    WHERE id = (SELECT pin_id FROM comments WHERE id = ${commentId})
    FOR NO KEY UPDATE
  `);
}
