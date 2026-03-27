/* eslint-disable @typescript-eslint/no-explicit-any */
import { db, sql } from "@/db";
import { pins, comments, commentVotes, userStats } from "@/db/schema/app";
import { user } from "@/db/schema/auth";
import { eq, desc, count } from "drizzle-orm";

const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 100;

function parsePagination(page?: number, pageSize?: number) {
  const p = Math.max(1, page || 1);
  const size = Math.min(MAX_PAGE_SIZE, Math.max(1, pageSize || DEFAULT_PAGE_SIZE));
  return { limit: size, offset: (p - 1) * size, page: p, pageSize: size };
}

export const adminService = {
  async getAllUsers(page?: number, pageSize?: number) {
    const { limit, offset, page: currentPage, pageSize: currentSize } = parsePagination(page, pageSize);

    const [totalResult] = await db.select({ count: count() }).from(user);
    const users = await db
      .select({
        id: user.id,
        email: user.email,
        name: user.name,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        role: user.role,
        createdAt: user.createdAt,
      })
      .from(user)
      .orderBy(desc(user.createdAt))
      .limit(limit)
      .offset(offset);

    return {
      data: users,
      pagination: { page: currentPage, pageSize: currentSize, total: totalResult.count },
      error: null,
    };
  },

  async getAllPins(page?: number, pageSize?: number) {
    const { limit, offset, page: currentPage, pageSize: currentSize } = parsePagination(page, pageSize);

    const [totalResult] = await db.select({ count: count() }).from(pins);
    const rows = await db
      .select({
        id: pins.id,
        userId: pins.userId,
        name: pins.name,
        location: pins.location,
        createdAt: pins.createdAt,
        updatedAt: pins.updatedAt,
        userEmail: user.email,
        userDisplayName: user.displayName,
      })
      .from(pins)
      .leftJoin(user, eq(pins.userId, user.id))
      .orderBy(desc(pins.createdAt))
      .limit(limit)
      .offset(offset);

    const data = rows.map((row) => ({
      id: row.id,
      user_id: row.userId,
      name: row.name,
      location: row.location,
      created_at: row.createdAt.toISOString(),
      updated_at: row.updatedAt.toISOString(),
      profiles: {
        id: row.userId,
        email: row.userEmail,
      },
    }));

    return {
      data,
      pagination: { page: currentPage, pageSize: currentSize, total: totalResult.count },
      error: null,
    };
  },

  async getAllComments(page?: number, pageSize?: number) {
    const { limit, offset, page: currentPage, pageSize: currentSize } = parsePagination(page, pageSize);

    const [totalResult] = await db.select({ count: count() }).from(comments);
    const rows = await db
      .select({
        id: comments.id,
        userId: comments.userId,
        pinId: comments.pinId,
        text: comments.text,
        isFirstComment: comments.isFirstComment,
        photoUrl: comments.photoUrl,
        createdAt: comments.createdAt,
        userEmail: user.email,
        pinName: pins.name,
        pinLocation: pins.location,
      })
      .from(comments)
      .leftJoin(user, eq(comments.userId, user.id))
      .leftJoin(pins, eq(comments.pinId, pins.id))
      .orderBy(desc(comments.createdAt))
      .limit(limit)
      .offset(offset);

    const data = rows.map((row) => ({
      id: row.id,
      user_id: row.userId,
      pin_id: row.pinId,
      text: row.text,
      is_first_comment: row.isFirstComment,
      photo_url: row.photoUrl,
      created_at: row.createdAt.toISOString(),
      profiles: {
        id: row.userId,
        email: row.userEmail,
      },
      pins: {
        id: row.pinId,
        name: row.pinName,
        location: row.pinLocation,
      },
    }));

    return {
      data,
      pagination: { page: currentPage, pageSize: currentSize, total: totalResult.count },
      error: null,
    };
  },

  async deletePin(pinId: string) {
    await db.delete(pins).where(eq(pins.id, pinId));
    return { error: null };
  },

  async deleteComment(commentId: string) {
    await db.delete(comments).where(eq(comments.id, commentId));
    return { error: null };
  },

  async deleteUser(userId: string) {
    // Cascade will handle related records
    await db.delete(user).where(eq(user.id, userId));
    return { error: null };
  },

  async getAnalytics() {
    // Run independent queries in parallel
    const [
      [usersCount],
      [pinsCount],
      [commentsCount],
      [statsAgg],
      recentPins,
      recentComments,
      topUsers,
    ] = await Promise.all([
      db.select({ count: count() }).from(user),
      db.select({ count: count() }).from(pins),
      db.select({ count: count() }).from(comments),
      // Aggregate stats in SQL instead of loading all rows into memory
      db
        .select({
          totalLikes: sql<number>`COALESCE(SUM(${userStats.totalLikesReceived}), 0)`.as("total_likes"),
          totalDislikes: sql<number>`COALESCE(SUM(${userStats.totalDislikesReceived}), 0)`.as("total_dislikes"),
          totalVotes: sql<number>`COALESCE(SUM(${userStats.totalVotesGiven}), 0)`.as("total_votes"),
        })
        .from(userStats),
      db
        .select({ createdAt: pins.createdAt })
        .from(pins)
        .orderBy(desc(pins.createdAt))
        .limit(10),
      db
        .select({ createdAt: comments.createdAt })
        .from(comments)
        .orderBy(desc(comments.createdAt))
        .limit(10),
      db
        .select({
          userId: userStats.userId,
          totalPins: userStats.totalPins,
          totalComments: userStats.totalComments,
          totalLikesReceived: userStats.totalLikesReceived,
          lastActivityAt: userStats.lastActivityAt,
          email: user.email,
        })
        .from(userStats)
        .leftJoin(user, eq(userStats.userId, user.id))
        .orderBy(desc(userStats.totalPins))
        .limit(5),
    ]);

    return {
      totalUsers: usersCount.count,
      totalPins: pinsCount.count,
      totalComments: commentsCount.count,
      totalLikes: Number(statsAgg.totalLikes),
      totalDislikes: Number(statsAgg.totalDislikes),
      totalVotes: Number(statsAgg.totalVotes),
      recentPins: recentPins.map((p) => ({
        created_at: p.createdAt.toISOString(),
      })),
      recentComments: recentComments.map((c) => ({
        created_at: c.createdAt.toISOString(),
      })),
      topUsers: topUsers.map((u) => ({
        user_id: u.userId,
        total_pins: u.totalPins,
        total_comments: u.totalComments,
        total_likes_received: u.totalLikesReceived,
        last_activity_at: u.lastActivityAt.toISOString(),
        users: { email: u.email },
      })),
    };
  },

  async refreshAllUserStats() {
    try {
      await db.execute(sql`SELECT populate_user_stats()`);
      return { success: true, error: null };
    } catch (error) {
      console.error("refreshAllUserStats error:", error);
      return { success: false, error: "Failed to refresh user statistics" };
    }
  },

  async getUserStatsSummary() {
    try {
      const [result] = await db
        .select({
          totalUsers: count(),
          totalPins: sql<number>`COALESCE(SUM(${userStats.totalPins}), 0)`,
          totalComments: sql<number>`COALESCE(SUM(${userStats.totalComments}), 0)`,
          totalLikes: sql<number>`COALESCE(SUM(${userStats.totalLikesReceived}), 0)`,
          totalDislikes: sql<number>`COALESCE(SUM(${userStats.totalDislikesReceived}), 0)`,
          totalVotes: sql<number>`COALESCE(SUM(${userStats.totalVotesGiven}), 0)`,
          lastActivity: sql<string>`COALESCE(MAX(${userStats.lastActivityAt})::text, '1970-01-01T00:00:00.000Z')`,
        })
        .from(userStats);

      if (!result || result.totalUsers === 0) return null;

      return {
        totalUsers: result.totalUsers,
        totalPins: Number(result.totalPins),
        totalComments: Number(result.totalComments),
        totalLikes: Number(result.totalLikes),
        totalDislikes: Number(result.totalDislikes),
        totalVotes: Number(result.totalVotes),
        lastActivity: result.lastActivity,
      };
    } catch (error) {
      console.error("getUserStatsSummary error:", error);
      return null;
    }
  },
};
