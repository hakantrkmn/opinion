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
  assertCommunityMember,
  communityCommentFilterSql,
} from "@/server/services/communities";
import {
  commentColumnsSql,
  pinOpenToSql,
  pinVisibleSql,
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
import { checkCreateDistance } from "./geo";

export interface DeviceFix {
  lat: number;
  lng: number;
  accuracy: number;
}
import type { SQL } from "drizzle-orm";

const ORDER_BY: Record<CommentSort, SQL> = {
  // Written on site counts as one extra vote.
  popular: sql`(c.likes_count - c.dislikes_count + c.verified_visit::int) DESC, c.likes_count DESC, c.created_at DESC, c.id`,
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
  /** Only this community's members (the viewer must be one: 404 otherwise). */
  communityId?: string | null;
}): Promise<PinCommentsResponse> {
  const { pinId, viewerId, sort, limit, offset, communityId } = params;
  if (communityId) await assertCommunityMember(communityId, viewerId);
  const visible = sql`${visibleToViewerSql(sql`c.user_id`, viewerId)}${
    communityId ? communityCommentFilterSql(communityId) : sql.empty()
  }`;
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
        AND ${pinVisibleSql(viewerId)}
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

/**
 * Pin owner + coordinates, for block and "Was here" checks. Null when the
 * pin is missing or in a community the user is not in.
 */
async function getPinForComment(pinId: string, userId: string) {
  const [pin] = (await db.execute(sql`
    SELECT p.user_id, ST_Y(p.location) AS lat, ST_X(p.location) AS lng
    FROM pins p
    WHERE p.id = ${pinId} AND ${pinOpenToSql(userId)}
  `)) as unknown as Array<{ user_id: string; lat: number; lng: number }>;
  return pin ? { userId: pin.user_id, lat: Number(pin.lat), lng: Number(pin.lng) } : null;
}

/**
 * POST /api/pins/:id/comments. With a device fix near the pin the comment
 * is "Was here"; a fix that is too far just doesn't earn it.
 */
export async function createComment(params: {
  pinId: string;
  userId: string;
  text: string;
  photoUrl?: string | null;
  device?: DeviceFix | null;
}): Promise<CommentItem> {
  const { pinId, userId, text } = params;
  const photoUrl = params.photoUrl || null;
  if (photoUrl) assertOwnedPhoto(photoUrl, userId);

  const found = await getPinForComment(pinId, userId);
  if (!found) throw notFound("Pin");
  const pin = { user_id: found.userId };
  const verified = params.device
    ? checkCreateDistance(found, params.device, params.device.accuracy).ok
    : false;
  if (await isBlockedRelation(userId, pin.user_id)) {
    throw HttpError.forbidden("You cannot comment on this pin");
  }

  const photoMetadata = photoUrl ? await readPhotoMetadata(photoUrl) : null;
  const id = crypto.randomUUID();
  try {
    await db.execute(sql`
      INSERT INTO comments (id, pin_id, user_id, text, photo_url, photo_metadata, verified_visit)
      VALUES (${id}, ${pinId}, ${userId}, ${text}, ${photoUrl},
              ${photoMetadata ? JSON.stringify(photoMetadata) : null}::jsonb, ${verified})
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

/**
 * PATCH /api/comments/:id — owner only (404 otherwise; also after leaving
 * the pin's community). A device fix near
 * the pin marks the comment "Was here" ("I'm here now"; 422 TOO_FAR when
 * too far) without counting as an edit.
 */
export async function updateComment(params: {
  commentId: string;
  userId: string;
  text?: string;
  /** undefined = keep, null = remove, string = replace */
  photoUrl?: string | null;
  device?: DeviceFix | null;
}): Promise<CommentItem> {
  const { commentId, userId, text, photoUrl, device } = params;
  if (photoUrl) assertOwnedPhoto(photoUrl, userId);
  const photoMetadata = photoUrl ? await readPhotoMetadata(photoUrl) : null;

  const oldPhoto = await db.transaction(async (tx) => {
    const [current] = (await tx.execute(sql`
      SELECT c.photo_url, ST_Y(p.location) AS lat, ST_X(p.location) AS lng
      FROM comments c JOIN pins p ON p.id = c.pin_id
      WHERE c.id = ${commentId} AND c.user_id = ${userId}
        AND ${pinOpenToSql(userId)}
      FOR UPDATE OF c
    `)) as unknown as Array<{ photo_url: string | null; lat: number; lng: number }>;
    if (!current) throw notFound("Comment");

    const sets: SQL[] = [];
    if (text !== undefined) sets.push(sql`text = ${text}`);
    if (photoUrl !== undefined) {
      sets.push(sql`photo_url = ${photoUrl}`);
      sets.push(
        sql`photo_metadata = ${photoMetadata ? JSON.stringify(photoMetadata) : null}::jsonb`
      );
    }
    if (sets.length > 0) sets.push(sql`updated_at = now()`);
    if (device) {
      const pin = { lat: Number(current.lat), lng: Number(current.lng) };
      const distance = checkCreateDistance(pin, device, device.accuracy);
      if (!distance.ok) {
        throw new HttpError(
          422,
          "TOO_FAR",
          `You must be within ${Math.round(distance.maxDistance)} m of the place`,
          {
            distance_m: Math.round(distance.distance),
            max_distance_m: Math.round(distance.maxDistance),
          }
        );
      }
      sets.push(sql`verified_visit = true`);
    }
    if (sets.length === 0) return current.photo_url;
    await tx.execute(sql`
      UPDATE comments SET ${sql.join(sets, sql`, `)}
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
