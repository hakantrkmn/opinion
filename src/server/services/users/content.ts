import "server-only";
import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/server/db";
import { user } from "@/server/db/schema/auth";
import { comments, commentVotes, pins } from "@/server/db/schema/app";
import { toPaginated, type OffsetPagination } from "@/server/http/pagination";
import { isoRequired, toPhotoMetadata, toUserSummary } from "./mappers";
import type { Paginated, PinSummary, VoteValue } from "@/types/api";
import type { UserCommentItem } from "@/types/userTypes";

/** Pins created by `userId`, newest first. */
export async function listUserPins(
  userId: string,
  page: OffsetPagination
): Promise<Paginated<PinSummary>> {
  const rows = await db
    .select({
      id: pins.id,
      name: pins.name,
      lat: sql<number>`ST_Y(${pins.location})`,
      lng: sql<number>`ST_X(${pins.location})`,
      createdAt: pins.createdAt,
      userId: user.id,
      displayName: user.displayName,
      userName: user.name,
      avatarUrl: user.avatarUrl,
      deletedAt: user.deletedAt,
      commentsCount: pins.commentsCount,
    })
    .from(pins)
    .innerJoin(user, eq(user.id, pins.userId))
    .where(eq(pins.userId, userId))
    .orderBy(desc(pins.createdAt), desc(pins.id))
    .limit(page.limit + 1)
    .offset(page.offset);

  return toPaginated(
    rows.map((r) => ({
      id: r.id,
      name: r.name,
      lat: Number(r.lat),
      lng: Number(r.lng),
      user: toUserSummary({
        id: r.userId,
        displayName: r.displayName ?? r.userName,
        avatarUrl: r.avatarUrl,
        deletedAt: r.deletedAt,
      }),
      comments_count: Number(r.commentsCount) || 0,
      created_at: isoRequired(r.createdAt),
    })),
    page
  );
}

/** Comments written by `userId`, newest first, with the pin they belong to. */
export async function listUserComments(
  userId: string,
  viewerId: string | null,
  page: OffsetPagination
): Promise<Paginated<UserCommentItem>> {
  const rows = await db
    .select({
      id: comments.id,
      pinId: comments.pinId,
      text: comments.text,
      photoUrl: comments.photoUrl,
      photoMetadata: comments.photoMetadata,
      isFirstComment: comments.isFirstComment,
      createdAt: comments.createdAt,
      updatedAt: comments.updatedAt,
      pinName: pins.name,
      userId: user.id,
      displayName: user.displayName,
      userName: user.name,
      avatarUrl: user.avatarUrl,
      deletedAt: user.deletedAt,
      likes: comments.likesCount,
      dislikes: comments.dislikesCount,
      myVote: viewerId
        ? sql<number>`COALESCE((SELECT ${commentVotes.value}::int FROM ${commentVotes} WHERE ${commentVotes.commentId} = ${comments.id} AND ${commentVotes.userId} = ${viewerId}), 0)`
        : sql<number>`0`,
    })
    .from(comments)
    .innerJoin(pins, eq(pins.id, comments.pinId))
    .innerJoin(user, eq(user.id, comments.userId))
    .where(eq(comments.userId, userId))
    .orderBy(desc(comments.createdAt), desc(comments.id))
    .limit(page.limit + 1)
    .offset(page.offset);

  return toPaginated(
    rows.map((r) => ({
      id: r.id,
      pin_id: r.pinId,
      text: r.text,
      photo_url: r.photoUrl,
      photo_metadata: toPhotoMetadata(r.photoMetadata),
      is_first_comment: r.isFirstComment,
      created_at: isoRequired(r.createdAt),
      updated_at: isoRequired(r.updatedAt),
      user: toUserSummary({
        id: r.userId,
        displayName: r.displayName ?? r.userName,
        avatarUrl: r.avatarUrl,
        deletedAt: r.deletedAt,
      }),
      likes: Number(r.likes) || 0,
      dislikes: Number(r.dislikes) || 0,
      my_vote: (Math.sign(Number(r.myVote)) || 0) as VoteValue,
      pin: { id: r.pinId, name: r.pinName },
    })),
    page
  );
}
