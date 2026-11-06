import "server-only";
import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/server/db";
import { user } from "@/server/db/schema/auth";
import { comments, commentVotes, pins } from "@/server/db/schema/app";
import { toPaginated, type OffsetPagination } from "@/server/http/pagination";
import { pinVisibleSql } from "@/server/services/pins/sql";
import { toCommunityColor } from "@/constants/community-colors";
import { isoRequired, toPhotoMetadata, toUserSummary } from "./mappers";
import type { Paginated, PinSummary, VoteValue } from "@/types/api";
import type { UserCommentItem } from "@/types/userTypes";

/** Community-only pins show only to members (and their author). */
function pinVisibleTo(viewerId: string) {
  return pinVisibleSql(viewerId, {
    communityId: sql`${pins.communityId}`,
    userId: sql`${pins.userId}`,
  });
}

/** Pins created by `userId` that `viewerId` may see, newest first. */
export async function listUserPins(
  userId: string,
  viewerId: string,
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
      communityId: pins.communityId,
      communityName: sql<string | null>`(SELECT cm.name FROM communities cm WHERE cm.id = ${pins.communityId})`,
      communityColor: sql<string | null>`(SELECT cm.color FROM communities cm WHERE cm.id = ${pins.communityId})`,
    })
    .from(pins)
    .innerJoin(user, eq(user.id, pins.userId))
    .where(and(eq(pins.userId, userId), pinVisibleTo(viewerId)))
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
      community:
        r.communityId && r.communityName
          ? { id: r.communityId, name: r.communityName, color: toCommunityColor(r.communityColor) }
          : null,
    })),
    page
  );
}

/**
 * Comments written by `userId`, newest first, with the pin they belong to.
 * Comments on community-only pins the viewer cannot see are left out.
 */
export async function listUserComments(
  userId: string,
  viewerId: string,
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
      verifiedVisit: comments.verifiedVisit,
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
      myVote: sql<number>`COALESCE((SELECT ${commentVotes.value}::int FROM ${commentVotes} WHERE ${commentVotes.commentId} = ${comments.id} AND ${commentVotes.userId} = ${viewerId}), 0)`,
    })
    .from(comments)
    .innerJoin(pins, eq(pins.id, comments.pinId))
    .innerJoin(user, eq(user.id, comments.userId))
    .where(and(eq(comments.userId, userId), pinVisibleTo(viewerId)))
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
      verified_visit: r.verifiedVisit,
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
