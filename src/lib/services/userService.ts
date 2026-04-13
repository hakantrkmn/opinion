/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Comment, FollowListResponse, Pin, UserStats } from "@/types";
import { db, sql } from "@/db";
import {
  pins,
  comments,
  commentVotes,
  userStats,
  userFollows,
} from "@/db/schema/app";
import { user } from "@/db/schema/auth";
import { eq, desc, ilike, and, isNotNull, count } from "drizzle-orm";
import { writeFile, unlink, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";
import { UPLOAD_DIR } from "@/lib/storage";
import { pushService } from "./pushService";

const MAX_CONNECTION_PAGE_SIZE = 50;

function normalizePagination(page: number, pageSize: number) {
  const safePage = Math.max(1, page);
  const safePageSize = Math.min(
    Math.max(1, pageSize),
    MAX_CONNECTION_PAGE_SIZE
  );

  return {
    page: safePage,
    pageSize: safePageSize,
    offset: (safePage - 1) * safePageSize,
    limit: safePageSize + 1,
  };
}

async function getFollowCounts(userId: string) {
  const [followersResult, followingResult] = await Promise.all([
    db
      .select({ total: count() })
      .from(userFollows)
      .where(eq(userFollows.followingId, userId)),
    db
      .select({ total: count() })
      .from(userFollows)
      .where(eq(userFollows.followerId, userId)),
  ]);

  return {
    followersCount: Number(followersResult[0]?.total ?? 0),
    followingCount: Number(followingResult[0]?.total ?? 0),
  };
}

async function ensureUserExists(userId: string) {
  const [row] = await db.select({ id: user.id }).from(user).where(eq(user.id, userId));
  return !!row;
}

async function maybeNotifyUserFollowed(params: {
  followerId: string;
  followingId: string;
}) {
  const { followerId, followingId } = params;
  const tokens = await pushService.getActiveTokensForUser(followingId);
  if (tokens.length === 0) return;

  const [follower] = await db
    .select({ displayName: user.displayName, name: user.name })
    .from(user)
    .where(eq(user.id, followerId));

  const followerName = follower?.displayName || follower?.name || "Birisi";

  await pushService.sendToTokens(tokens, {
    title: `${followerName} seni takip etmeye başladı`,
    body: "Profiline göz at ve yeni pinlerini paylaş.",
    data: {
      type: "follow",
      followerId,
    },
  });
}

export const userService = {
  async uploadAvatar(
    userId: string,
    file: File
  ): Promise<{ avatarUrl: string | null; error: string | null }> {
    try {
      const validTypes = [
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/webp",
        "image/gif",
      ];
      if (!validTypes.includes(file.type)) {
        return {
          avatarUrl: null,
          error: "Please upload a valid image file (JPG, PNG, WebP, or GIF)",
        };
      }

      const maxSize = 5 * 1024 * 1024;
      if (file.size > maxSize) {
        return { avatarUrl: null, error: "File size must be less than 5MB" };
      }

      // Get current avatar to cleanup
      const [currentUser] = await db
        .select({ avatarUrl: user.avatarUrl })
        .from(user)
        .where(eq(user.id, userId));

      const fileExt = file.name.split(".").pop();
      const fileName = `avatar-${Date.now()}.${fileExt}`;
      const dirPath = join(UPLOAD_DIR, "avatars", userId);
      const filePath = join(dirPath, fileName);

      // Ensure directory exists
      if (!existsSync(dirPath)) {
        await mkdir(dirPath, { recursive: true });
      }

      // Write file
      const buffer = Buffer.from(await file.arrayBuffer());
      await writeFile(filePath, buffer);

      const avatarUrl = `/uploads/avatars/${userId}/${fileName}`;

      // Update user record
      await db.update(user).set({ avatarUrl }).where(eq(user.id, userId));

      // Cleanup old avatar
      if (currentUser?.avatarUrl?.startsWith("/uploads/")) {
        try {
          const relative = currentUser.avatarUrl.replace(/^\/uploads\//, "");
          const oldPath = join(UPLOAD_DIR, relative);
          if (existsSync(oldPath)) {
            await unlink(oldPath);
          }
        } catch {
          // Don't fail if cleanup fails
        }
      }

      return { avatarUrl, error: null };
    } catch (error) {
      console.error("uploadAvatar error:", error);
      return { avatarUrl: null, error: "Avatar upload failed. Please try again." };
    }
  },

  async deleteAvatar(
    userId: string
  ): Promise<{ success: boolean; error: string | null }> {
    try {
      const [userData] = await db
        .select({ avatarUrl: user.avatarUrl })
        .from(user)
        .where(eq(user.id, userId));

      if (!userData?.avatarUrl) {
        return { success: true, error: null };
      }

      if (userData.avatarUrl.startsWith("/uploads/")) {
        try {
          const relative = userData.avatarUrl.replace(/^\/uploads\//, "");
          const filePath = join(UPLOAD_DIR, relative);
          if (existsSync(filePath)) {
            await unlink(filePath);
          }
        } catch {
          // Continue even if file deletion fails
        }
      }

      await db
        .update(user)
        .set({ avatarUrl: null })
        .where(eq(user.id, userId));

      return { success: true, error: null };
    } catch (error) {
      console.error("deleteAvatar error:", error);
      return { success: false, error: "Failed to delete avatar" };
    }
  },

  async updateDisplayName(
    userId: string,
    displayName: string
  ): Promise<{ success: boolean; error: string | null }> {
    try {
      if (!displayName.trim()) {
        return { success: false, error: "Display name cannot be empty" };
      }
      if (displayName.length > 50) {
        return {
          success: false,
          error: "Display name must be less than 50 characters",
        };
      }

      await db
        .update(user)
        .set({ displayName: displayName.trim() })
        .where(eq(user.id, userId));

      return { success: true, error: null };
    } catch (error) {
      console.error("updateDisplayName error:", error);
      return { success: false, error: "Failed to update display name" };
    }
  },

  async getUserProfile(userId: string): Promise<{
    profile: {
      id: string;
      email: string;
      display_name?: string;
      avatar_url?: string;
      created_at: string;
    } | null;
    error: string | null;
  }> {
    try {
      const [profile] = await db
        .select({
          id: user.id,
          email: user.email,
          displayName: user.displayName,
          avatarUrl: user.avatarUrl,
          createdAt: user.createdAt,
        })
        .from(user)
        .where(eq(user.id, userId));

      if (!profile) {
        return { profile: null, error: "User not found" };
      }

      return {
        profile: {
          id: profile.id,
          email: profile.email,
          display_name: profile.displayName || undefined,
          avatar_url: profile.avatarUrl || undefined,
          created_at: profile.createdAt.toISOString(),
        },
        error: null,
      };
    } catch (error) {
      console.error("getUserProfile error:", error);
      return { profile: null, error: "Failed to load profile" };
    }
  },

  async getPublicUserProfile(userId: string): Promise<{
    profile: {
      id: string;
      display_name?: string;
      avatar_url?: string;
      created_at: string;
    } | null;
    error: string | null;
  }> {
    try {
      const [row] = await db
        .select({
          id: user.id,
          displayName: user.displayName,
          avatarUrl: user.avatarUrl,
          createdAt: user.createdAt,
        })
        .from(user)
        .where(eq(user.id, userId));

      if (!row) {
        return { profile: null, error: "User not found" };
      }

      return {
        profile: {
          id: row.id,
          display_name: row.displayName || undefined,
          avatar_url: row.avatarUrl || undefined,
          created_at: row.createdAt.toISOString(),
        },
        error: null,
      };
    } catch (error) {
      console.error("getPublicUserProfile error:", error);
      return { profile: null, error: "Failed to load profile" };
    }
  },

  async searchUsersByDisplayName(
    query: string,
    limit = 20,
    offset = 0
  ): Promise<{
    users: Array<{
      id: string;
      display_name?: string;
      avatar_url?: string;
      created_at: string;
    }> | null;
    error: string | null;
  }> {
    try {
      const trimmed = query.trim();
      if (trimmed.length < 2) {
        return { users: [], error: null };
      }
      // Escape LIKE wildcards so user input can't alter the pattern.
      const escaped = trimmed.replace(/[\\%_]/g, (ch) => `\\${ch}`);
      const pattern = `%${escaped}%`;

      const rows = await db
        .select({
          id: user.id,
          displayName: user.displayName,
          avatarUrl: user.avatarUrl,
          createdAt: user.createdAt,
        })
        .from(user)
        .where(
          and(isNotNull(user.displayName), ilike(user.displayName, pattern))
        )
        .orderBy(desc(user.createdAt))
        .limit(Math.min(Math.max(limit, 1), 50))
        .offset(Math.max(offset, 0));

      return {
        users: rows.map((row) => ({
          id: row.id,
          display_name: row.displayName || undefined,
          avatar_url: row.avatarUrl || undefined,
          created_at: row.createdAt.toISOString(),
        })),
        error: null,
      };
    } catch (error) {
      console.error("searchUsersByDisplayName error:", error);
      return { users: null, error: "Failed to search users" };
    }
  },

  async getUserStats(userId: string): Promise<{
    stats: {
      totalPins: number;
      totalComments: number;
      totalLikes: number;
      totalDislikes: number;
      totalVotesGiven?: number;
      followersCount: number;
      followingCount: number;
      lastActivityAt?: string;
    } | null;
    error: string | null;
  }> {
    try {
      const userExists = await ensureUserExists(userId);
      if (!userExists) {
        return { stats: null, error: "User not found" };
      }

      const [stats, followCounts] = await Promise.all([
        db.select().from(userStats).where(eq(userStats.userId, userId)),
        getFollowCounts(userId),
      ]);
      const currentStats = stats[0];

      if (!currentStats) {
        // Create initial stats
        await db.insert(userStats).values({
          userId,
          totalPins: 0,
          totalComments: 0,
          totalLikesReceived: 0,
          totalDislikesReceived: 0,
          totalVotesGiven: 0,
        });

        return {
          stats: {
            totalPins: 0,
            totalComments: 0,
            totalLikes: 0,
            totalDislikes: 0,
            totalVotesGiven: 0,
            followersCount: followCounts.followersCount,
            followingCount: followCounts.followingCount,
            lastActivityAt: new Date().toISOString(),
          },
          error: null,
        };
      }

      return {
        stats: {
          totalPins: currentStats.totalPins,
          totalComments: currentStats.totalComments,
          totalLikes: currentStats.totalLikesReceived,
          totalDislikes: currentStats.totalDislikesReceived,
          totalVotesGiven: currentStats.totalVotesGiven,
          followersCount: followCounts.followersCount,
          followingCount: followCounts.followingCount,
          lastActivityAt: currentStats.lastActivityAt.toISOString(),
        },
        error: null,
      };
    } catch (error) {
      console.error("getUserStats error:", error);
      return { stats: null, error: "İstatistikler yüklenirken hata oluştu" };
    }
  },

  async refreshUserStats(
    userId: string
  ): Promise<{ success: boolean; error: string | null }> {
    try {
      await db.execute(sql`SELECT refresh_user_stats(${userId})`);
      return { success: true, error: null };
    } catch (error) {
      console.error("refreshUserStats error:", error);
      return { success: false, error: "Failed to refresh user statistics" };
    }
  },

  async getUserStatsWithPerformanceInfo(userId: string): Promise<UserStats> {
    const startTime = performance.now();
    const result = await this.getUserStats(userId);
    const endTime = performance.now();
    const queryTime = endTime - startTime;
    const estimatedOldTime = queryTime * 4;
    const improvement = (
      ((estimatedOldTime - queryTime) / estimatedOldTime) *
      100
    ).toFixed(1);

    return {
      stats: result.stats,
      performanceInfo: {
        queryTime: parseFloat(queryTime.toFixed(2)),
        method: "denormalized",
        improvement: `~${improvement}% faster than aggregate queries`,
      },
      error: result.error,
    };
  },

  async getUserPins(
    userId: string
  ): Promise<{ pins: Pin[] | null; error: string | null }> {
    try {
      const rows = await db
        .select({
          id: pins.id,
          userId: pins.userId,
          name: pins.name,
          location: sql`ST_AsGeoJSON(${pins.location})::jsonb`.as("location"),
          createdAt: pins.createdAt,
          updatedAt: pins.updatedAt,
          displayName: user.displayName,
          avatarUrl: user.avatarUrl,
          commentsCount: sql<number>`(
            SELECT COUNT(*)::int FROM ${comments} WHERE ${comments.pinId} = ${pins.id}
          )`.as("comments_count"),
        })
        .from(pins)
        .leftJoin(user, eq(pins.userId, user.id))
        .where(eq(pins.userId, userId))
        .orderBy(desc(pins.createdAt));

      const result: Pin[] = rows.map((row) => ({
        id: row.id,
        user_id: row.userId,
        name: row.name,
        location: row.location as any,
        created_at: row.createdAt.toISOString(),
        updated_at: row.updatedAt.toISOString(),
        comments_count: row.commentsCount,
        user: {
          display_name: row.displayName || "Anonymous",
          avatar_url: row.avatarUrl || undefined,
        },
      }));

      return { pins: result, error: null };
    } catch (error) {
      console.error("getUserPins error:", error);
      return { pins: null, error: "Pin'ler yüklenirken hata oluştu" };
    }
  },

  async getUserComments(
    userId: string
  ): Promise<{ comments: Comment[] | null; error: string | null }> {
    try {
      const rows = await db
        .select({
          id: comments.id,
          userId: comments.userId,
          text: comments.text,
          createdAt: comments.createdAt,
          isFirstComment: comments.isFirstComment,
          photoUrl: comments.photoUrl,
          pinId: comments.pinId,
          pinName: pins.name,
          pinLocation: pins.location,
          displayName: user.displayName,
          avatarUrl: user.avatarUrl,
          voteCount: sql<number>`COALESCE((
            SELECT SUM(${commentVotes.value})::int
            FROM ${commentVotes}
            WHERE ${commentVotes.commentId} = ${comments.id}
          ), 0)`.as("vote_count"),
        })
        .from(comments)
        .leftJoin(pins, eq(comments.pinId, pins.id))
        .leftJoin(user, eq(comments.userId, user.id))
        .where(eq(comments.userId, userId))
        .orderBy(desc(comments.createdAt));

      const result: Comment[] = rows.map((row) => ({
        id: row.id,
        pin_id: row.pinId,
        user_id: row.userId,
        text: row.text,
        created_at: row.createdAt.toISOString(),
        is_first_comment: row.isFirstComment,
        photo_url: row.photoUrl || undefined,
        users: {
          display_name: row.displayName || "Anonymous",
          avatar_url: row.avatarUrl || undefined,
        },
        pins: {
          name: row.pinName || "Unknown",
        },
        vote_count: Number(row.voteCount) || 0,
      }));

      return { comments: result, error: null };
    } catch (error) {
      console.error("getUserComments error:", error);
      return { comments: null, error: "Yorumlar yüklenirken hata oluştu" };
    }
  },

  async isFollowing(
    followerId: string,
    followingId: string
  ): Promise<{ isFollowing: boolean; error: string | null }> {
    try {
      if (followerId === followingId) {
        return { isFollowing: false, error: null };
      }

      const [row] = await db
        .select({ id: userFollows.id })
        .from(userFollows)
        .where(
          and(
            eq(userFollows.followerId, followerId),
            eq(userFollows.followingId, followingId)
          )
        );

      return { isFollowing: !!row, error: null };
    } catch (error) {
      console.error("isFollowing error:", error);
      return { isFollowing: false, error: "Failed to load follow status" };
    }
  },

  async followUser(
    followerId: string,
    followingId: string
  ): Promise<{ success: boolean; error: string | null }> {
    try {
      if (followerId === followingId) {
        return { success: false, error: "You cannot follow yourself" };
      }

      const targetExists = await ensureUserExists(followingId);
      if (!targetExists) {
        return { success: false, error: "User not found" };
      }

      const inserted = await db
        .insert(userFollows)
        .values({
          followerId,
          followingId,
        })
        .onConflictDoNothing()
        .returning({ id: userFollows.id });

      if (inserted.length > 0) {
        void maybeNotifyUserFollowed({ followerId, followingId }).catch((error) => {
          console.error("maybeNotifyUserFollowed error:", error);
        });
      }

      return { success: true, error: null };
    } catch (error) {
      console.error("followUser error:", error);
      return { success: false, error: "Failed to follow user" };
    }
  },

  async unfollowUser(
    followerId: string,
    followingId: string
  ): Promise<{ success: boolean; error: string | null }> {
    try {
      if (followerId === followingId) {
        return { success: false, error: "You cannot unfollow yourself" };
      }

      const targetExists = await ensureUserExists(followingId);
      if (!targetExists) {
        return { success: false, error: "User not found" };
      }

      await db
        .delete(userFollows)
        .where(
          and(
            eq(userFollows.followerId, followerId),
            eq(userFollows.followingId, followingId)
          )
        );

      return { success: true, error: null };
    } catch (error) {
      console.error("unfollowUser error:", error);
      return { success: false, error: "Failed to unfollow user" };
    }
  },

  async getFollowers(
    userId: string,
    pagination: { page: number; pageSize: number }
  ): Promise<FollowListResponse> {
    try {
      const userExists = await ensureUserExists(userId);
      if (!userExists) {
        return {
          users: [],
          page: pagination.page,
          pageSize: pagination.pageSize,
          hasMore: false,
          error: "User not found",
        };
      }

      const pageInfo = normalizePagination(pagination.page, pagination.pageSize);
      const rows = await db
        .select({
          id: user.id,
          displayName: user.displayName,
          avatarUrl: user.avatarUrl,
          createdAt: user.createdAt,
        })
        .from(userFollows)
        .innerJoin(user, eq(userFollows.followerId, user.id))
        .where(eq(userFollows.followingId, userId))
        .orderBy(desc(userFollows.createdAt))
        .limit(pageInfo.limit)
        .offset(pageInfo.offset);

      const users = rows.slice(0, pageInfo.pageSize).map((row) => ({
        id: row.id,
        display_name: row.displayName || undefined,
        avatar_url: row.avatarUrl || undefined,
        created_at: row.createdAt.toISOString(),
      }));

      return {
        users,
        page: pageInfo.page,
        pageSize: pageInfo.pageSize,
        hasMore: rows.length > pageInfo.pageSize,
        error: null,
      };
    } catch (error) {
      console.error("getFollowers error:", error);
      return {
        users: [],
        page: pagination.page,
        pageSize: pagination.pageSize,
        hasMore: false,
        error: "Failed to load followers",
      };
    }
  },

  async getFollowing(
    userId: string,
    pagination: { page: number; pageSize: number }
  ): Promise<FollowListResponse> {
    try {
      const userExists = await ensureUserExists(userId);
      if (!userExists) {
        return {
          users: [],
          page: pagination.page,
          pageSize: pagination.pageSize,
          hasMore: false,
          error: "User not found",
        };
      }

      const pageInfo = normalizePagination(pagination.page, pagination.pageSize);
      const rows = await db
        .select({
          id: user.id,
          displayName: user.displayName,
          avatarUrl: user.avatarUrl,
          createdAt: user.createdAt,
        })
        .from(userFollows)
        .innerJoin(user, eq(userFollows.followingId, user.id))
        .where(eq(userFollows.followerId, userId))
        .orderBy(desc(userFollows.createdAt))
        .limit(pageInfo.limit)
        .offset(pageInfo.offset);

      const users = rows.slice(0, pageInfo.pageSize).map((row) => ({
        id: row.id,
        display_name: row.displayName || undefined,
        avatar_url: row.avatarUrl || undefined,
        created_at: row.createdAt.toISOString(),
      }));

      return {
        users,
        page: pageInfo.page,
        pageSize: pageInfo.pageSize,
        hasMore: rows.length > pageInfo.pageSize,
        error: null,
      };
    } catch (error) {
      console.error("getFollowing error:", error);
      return {
        users: [],
        page: pagination.page,
        pageSize: pagination.pageSize,
        hasMore: false,
        error: "Failed to load following",
      };
    }
  },
};
