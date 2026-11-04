import "server-only";
import { and, desc, eq, isNull, isNotNull, notInArray } from "drizzle-orm";
import { db } from "@/server/db";
import { containsText } from "@/server/db/search";
import { user } from "@/server/db/schema/auth";
import { userFollows } from "@/server/db/schema/app";
import { HttpError } from "@/server/http/api-helpers";
import { toPaginated, type OffsetPagination } from "@/server/http/pagination";
import {
  getInvisibleUserIds,
  isBlockedRelation,
} from "@/server/services/blocks";
import { recordNotifications } from "@/server/services/inbox";
import { pushService } from "@/server/services/pushService";
import { pushCopy, recipientLocale } from "@/server/i18n/push-copy";
import { assertActiveUser } from "./profile";
import { isoRequired, toUserSummary } from "./mappers";
import type { Paginated, UserSummary } from "@/types/api";
import type { FollowListUser } from "@/types/userTypes";

export async function isFollowing(
  followerId: string,
  followingId: string
): Promise<boolean> {
  if (followerId === followingId) return false;
  const [row] = await db
    .select({ id: userFollows.id })
    .from(userFollows)
    .where(
      and(
        eq(userFollows.followerId, followerId),
        eq(userFollows.followingId, followingId)
      )
    )
    .limit(1);
  return !!row;
}

/** Repeat follows (unfollow + follow) never push twice in this window. */
const FOLLOW_PUSH_COOLDOWN = "10 minutes";

async function notifyFollowed(followerId: string, followingId: string) {
  // One unread "new followers" row per user, whoever followed.
  const [recorded] = await recordNotifications({
    recipientIds: [followingId],
    type: "followed",
    groupTargetId: followingId,
    actorId: followerId,
    pushCooldown: FOLLOW_PUSH_COOLDOWN,
  });
  if (!recorded?.should_push) return;
  const devices = await pushService.getActiveDevicesForUser(followingId);
  if (devices.length === 0) return;
  const [[follower], [recipient]] = await Promise.all([
    db.select({ displayName: user.displayName }).from(user).where(eq(user.id, followerId)).limit(1),
    db.select({ locale: user.locale }).from(user).where(eq(user.id, followingId)).limit(1),
  ]);
  const copy = pushCopy.followed(recipientLocale(recipient?.locale), follower?.displayName ?? null);
  await pushService.sendToDevices(devices, {
    ...copy,
    data: { type: "follow", follower_id: followerId },
  });
}

export async function followUser(followerId: string, followingId: string) {
  if (followerId === followingId) {
    throw HttpError.badRequest("You cannot follow yourself");
  }
  await assertActiveUser(followingId);
  if (await isBlockedRelation(followerId, followingId)) {
    // Don't reveal who blocked whom.
    throw HttpError.forbidden("You can't follow this user");
  }
  const inserted = await db
    .insert(userFollows)
    .values({ followerId, followingId })
    .onConflictDoNothing()
    .returning({ id: userFollows.id });

  if (inserted.length > 0) {
    void notifyFollowed(followerId, followingId).catch((error) =>
      console.error("notifyFollowed failed:", error)
    );
  }
}

/** Idempotent: unfollowing someone you don't follow is a no-op. */
export async function unfollowUser(followerId: string, followingId: string) {
  await db
    .delete(userFollows)
    .where(
      and(
        eq(userFollows.followerId, followerId),
        eq(userFollows.followingId, followingId)
      )
    );
}

async function listConnections(
  direction: "followers" | "following",
  userId: string,
  viewerId: string,
  page: OffsetPagination
): Promise<Paginated<FollowListUser>> {
  await assertActiveUser(userId);
  if (await isBlockedRelation(viewerId, userId)) {
    throw HttpError.notFound("User not found");
  }

  const invisible = await getInvisibleUserIds(viewerId);
  const otherSide =
    direction === "followers" ? userFollows.followerId : userFollows.followingId;
  const thisSide =
    direction === "followers" ? userFollows.followingId : userFollows.followerId;

  const rows = await db
    .select({
      id: user.id,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      followedAt: userFollows.createdAt,
    })
    .from(userFollows)
    .innerJoin(user, eq(user.id, otherSide))
    .where(
      and(
        eq(thisSide, userId),
        isNull(user.deletedAt),
        invisible.length > 0 ? notInArray(user.id, invisible) : undefined
      )
    )
    .orderBy(desc(userFollows.createdAt), desc(user.id))
    .limit(page.limit + 1)
    .offset(page.offset);

  return toPaginated(
    rows.map((r) => ({
      ...toUserSummary(r),
      followed_at: isoRequired(r.followedAt),
    })),
    page
  );
}

export const getFollowers = (
  userId: string,
  viewerId: string,
  page: OffsetPagination
) => listConnections("followers", userId, viewerId, page);

export const getFollowing = (
  userId: string,
  viewerId: string,
  page: OffsetPagination
) => listConnections("following", userId, viewerId, page);

/** Case-insensitive display-name search; excludes deleted, blocked and self. */
export async function searchUsers(
  query: string,
  viewerId: string,
  page: OffsetPagination
): Promise<Paginated<UserSummary>> {
  const excluded = [viewerId, ...(await getInvisibleUserIds(viewerId))];

  const rows = await db
    .select({
      id: user.id,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
    })
    .from(user)
    .where(
      and(
        isNull(user.deletedAt),
        isNotNull(user.displayName),
        containsText(user.displayName, query.trim()),
        notInArray(user.id, excluded)
      )
    )
    .orderBy(user.displayName, user.id)
    .limit(page.limit + 1)
    .offset(page.offset);

  return toPaginated(rows.map(toUserSummary), page);
}
