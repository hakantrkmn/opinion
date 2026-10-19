import "server-only";
import { and, count, eq, isNull } from "drizzle-orm";
import { db } from "@/server/db";
import { user } from "@/server/db/schema/auth";
import { userFollows, userStats } from "@/server/db/schema/app";
import { HttpError } from "@/server/http/api-helpers";
import { deleteUploadByUrl } from "@/server/uploads";
import { storeProcessedImage } from "@/server/services/photoService";
import { iso, isoRequired } from "./mappers";
import type {
  OwnUserProfile,
  PublicUserProfile,
  UserStats,
} from "@/types/userTypes";
import type { UploadResponse } from "@/types/api";

/** Active (not soft-deleted) user row or null. */
export async function findActiveUser(userId: string) {
  const [row] = await db
    .select({
      id: user.id,
      email: user.email,
      emailVerified: user.emailVerified,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      role: user.role,
      createdAt: user.createdAt,
    })
    .from(user)
    .where(and(eq(user.id, userId), isNull(user.deletedAt)))
    .limit(1);
  return row ?? null;
}

export async function assertActiveUser(userId: string) {
  const row = await findActiveUser(userId);
  if (!row) throw HttpError.notFound("User not found");
  return row;
}

export async function getOwnProfile(userId: string): Promise<OwnUserProfile> {
  const row = await assertActiveUser(userId);
  return {
    id: row.id,
    display_name: row.displayName,
    avatar_url: row.avatarUrl,
    created_at: isoRequired(row.createdAt),
    email: row.email,
    email_verified: row.emailVerified,
    role: row.role === "admin" ? "admin" : "user",
  };
}

export async function getPublicProfile(
  userId: string
): Promise<PublicUserProfile> {
  const row = await assertActiveUser(userId);
  return {
    id: row.id,
    display_name: row.displayName,
    avatar_url: row.avatarUrl,
    created_at: isoRequired(row.createdAt),
  };
}

export async function getUserStats(userId: string): Promise<UserStats> {
  // Follow counts only include active users on the other side.
  const [statsRows, [followers], [following]] = await Promise.all([
    db
      .select({
        totalPins: userStats.totalPins,
        totalComments: userStats.totalComments,
        likes: userStats.totalLikesReceived,
        dislikes: userStats.totalDislikesReceived,
        votesGiven: userStats.totalVotesGiven,
        lastActivityAt: userStats.lastActivityAt,
      })
      .from(userStats)
      .where(eq(userStats.userId, userId))
      .limit(1),
    db
      .select({ n: count() })
      .from(userFollows)
      .innerJoin(user, eq(user.id, userFollows.followerId))
      .where(and(eq(userFollows.followingId, userId), isNull(user.deletedAt))),
    db
      .select({ n: count() })
      .from(userFollows)
      .innerJoin(user, eq(user.id, userFollows.followingId))
      .where(and(eq(userFollows.followerId, userId), isNull(user.deletedAt))),
  ]);
  const s = statsRows[0];
  return {
    total_pins: s?.totalPins ?? 0,
    total_comments: s?.totalComments ?? 0,
    total_likes_received: s?.likes ?? 0,
    total_dislikes_received: s?.dislikes ?? 0,
    total_votes_given: s?.votesGiven ?? 0,
    followers_count: Number(followers?.n ?? 0),
    following_count: Number(following?.n ?? 0),
    last_activity_at: iso(s?.lastActivityAt),
  };
}

export async function updateDisplayName(
  userId: string,
  displayName: string
): Promise<OwnUserProfile> {
  await db
    .update(user)
    .set({ displayName, updatedAt: new Date() })
    .where(and(eq(user.id, userId), isNull(user.deletedAt)));
  return getOwnProfile(userId);
}

/**
 * Re-encode and store a new avatar, then delete the previous file.
 * Throws ImageProcessingError for invalid images.
 */
export async function setAvatar(
  userId: string,
  file: File
): Promise<UploadResponse> {
  const current = await assertActiveUser(userId);
  const { url, metadata } = await storeProcessedImage(
    file,
    userId,
    "avatars",
    "avatar"
  );
  try {
    await db
      .update(user)
      .set({ avatarUrl: url, updatedAt: new Date() })
      .where(eq(user.id, userId));
  } catch (error) {
    await deleteUploadByUrl(url);
    throw error;
  }
  if (current.avatarUrl && current.avatarUrl !== url) {
    await deleteUploadByUrl(current.avatarUrl);
  }
  return { url, metadata };
}

export async function deleteAvatar(userId: string): Promise<void> {
  const current = await assertActiveUser(userId);
  if (!current.avatarUrl) return;
  await db
    .update(user)
    .set({ avatarUrl: null, updatedAt: new Date() })
    .where(eq(user.id, userId));
  await deleteUploadByUrl(current.avatarUrl);
}

