import { db, sql } from "@/db";
import {
  pins,
  comments,
  commentVotes,
  userStats,
  pushTokens,
  reports,
} from "@/db/schema/app";
import { user } from "@/db/schema/auth";
import { alias } from "drizzle-orm/pg-core";
import { and, eq, desc, count } from "drizzle-orm";
import { deleteCommentPhoto } from "@/lib/services/photoService";
import { unlink } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

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
        pushTokenCount: sql<number>`COALESCE(SUM(CASE WHEN ${pushTokens.isActive} = true THEN 1 ELSE 0 END), 0)::int`.as(
          "push_token_count"
        ),
      })
      .from(user)
      .leftJoin(pushTokens, eq(pushTokens.userId, user.id))
      .groupBy(user.id)
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
    // Delete comment photos before deleting the pin
    const pinComments = await db
      .select({ photoUrl: comments.photoUrl })
      .from(comments)
      .where(eq(comments.pinId, pinId));

    await Promise.all(
      pinComments
        .filter((c) => !!c.photoUrl)
        .map((c) => deleteCommentPhoto(c.photoUrl as string))
    );

    await db.delete(pins).where(eq(pins.id, pinId));
    return { error: null };
  },

  async deleteComment(commentId: string) {
    const [comment] = await db
      .select({
        pinId: comments.pinId,
        userId: comments.userId,
        photoUrl: comments.photoUrl,
      })
      .from(comments)
      .where(eq(comments.id, commentId));

    if (!comment) {
      return {
        success: false,
        pinDeleted: false,
        pinId: null,
        error: "Comment not found",
      };
    }

    const pinId = comment.pinId;

    const [pinRow] = await db
      .select({ userId: pins.userId })
      .from(pins)
      .where(eq(pins.id, pinId));

    const voterRows = await db
      .select({ userId: commentVotes.userId })
      .from(commentVotes)
      .where(eq(commentVotes.commentId, commentId));

    if (comment.photoUrl) {
      await deleteCommentPhoto(comment.photoUrl);
    }

    const commentsBefore = await db
      .select({ id: comments.id })
      .from(comments)
      .where(eq(comments.pinId, pinId));
    const commentCountBefore = commentsBefore.length;

    await db.delete(comments).where(eq(comments.id, commentId));

    const affectedUserIds = new Set<string>([comment.userId]);
    if (pinRow?.userId) affectedUserIds.add(pinRow.userId);
    for (const v of voterRows) affectedUserIds.add(v.userId);

    const { userService } = await import("./userService");
    await Promise.all(
      [...affectedUserIds].map((uid) =>
        userService.refreshUserStats(uid).catch((err) => {
          console.error("refreshUserStats after admin comment delete:", uid, err);
        })
      )
    );

    let pinDeleted = false;
    if (commentCountBefore === 1) {
      const pinExists = await db
        .select({ id: pins.id })
        .from(pins)
        .where(eq(pins.id, pinId));
      pinDeleted = pinExists.length === 0;
    }

    return { success: true, pinDeleted, pinId, error: null };
  },

  async deleteUser(userId: string) {
    // Delete user's avatar file
    const [userData] = await db
      .select({ avatarUrl: user.avatarUrl })
      .from(user)
      .where(eq(user.id, userId));

    if (userData?.avatarUrl?.startsWith("/uploads/")) {
      try {
        const filePath = join(process.cwd(), "public", userData.avatarUrl);
        if (existsSync(filePath)) {
          await unlink(filePath);
        }
      } catch {
        // Don't fail if cleanup fails
      }
    }

    // Delete all comment photos from user's comments
    const userComments = await db
      .select({ photoUrl: comments.photoUrl })
      .from(comments)
      .where(eq(comments.userId, userId));

    await Promise.all(
      userComments
        .filter((c) => !!c.photoUrl)
        .map((c) => deleteCommentPhoto(c.photoUrl as string))
    );

    // Cascade will handle related database records
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

  async getReports(params: {
    status?: "open" | "resolved" | "dismissed" | "all";
    page?: number;
    pageSize?: number;
  }) {
    const status = params.status ?? "open";
    const {
      limit,
      offset,
      page: currentPage,
      pageSize: currentSize,
    } = parsePagination(params.page, params.pageSize);

    const reporter = alias(user, "reporter");
    const whereClause = status === "all" ? undefined : eq(reports.status, status);

    const [totalResult] = whereClause
      ? await db.select({ count: count() }).from(reports).where(whereClause)
      : await db.select({ count: count() }).from(reports);

    const baseQuery = db
      .select({
        id: reports.id,
        targetType: reports.targetType,
        targetId: reports.targetId,
        reason: reports.reason,
        note: reports.note,
        status: reports.status,
        createdAt: reports.createdAt,
        resolvedAt: reports.resolvedAt,
        reporterId: reports.reporterId,
        reporterEmail: reporter.email,
        reporterDisplayName: reporter.displayName,
      })
      .from(reports)
      .leftJoin(reporter, eq(reports.reporterId, reporter.id));

    const rows = whereClause
      ? await baseQuery
          .where(whereClause)
          .orderBy(desc(reports.createdAt))
          .limit(limit)
          .offset(offset)
      : await baseQuery
          .orderBy(desc(reports.createdAt))
          .limit(limit)
          .offset(offset);

    // Hydrate target preview per row.
    const data = await Promise.all(
      rows.map(async (row) => {
        let targetPreview: {
          label: string;
          authorId: string | null;
          authorName: string | null;
          authorEmail: string | null;
          missing: boolean;
        } = {
          label: "",
          authorId: null,
          authorName: null,
          authorEmail: null,
          missing: false,
        };

        if (row.targetType === "pin") {
          const [pinRow] = await db
            .select({
              name: pins.name,
              authorId: pins.userId,
              displayName: user.displayName,
              email: user.email,
            })
            .from(pins)
            .leftJoin(user, eq(pins.userId, user.id))
            .where(eq(pins.id, row.targetId))
            .limit(1);
          if (pinRow) {
            targetPreview = {
              label: pinRow.name,
              authorId: pinRow.authorId,
              authorName: pinRow.displayName,
              authorEmail: pinRow.email,
              missing: false,
            };
          } else {
            targetPreview.missing = true;
          }
        } else if (row.targetType === "comment") {
          const [commentRow] = await db
            .select({
              text: comments.text,
              authorId: comments.userId,
              displayName: user.displayName,
              email: user.email,
            })
            .from(comments)
            .leftJoin(user, eq(comments.userId, user.id))
            .where(eq(comments.id, row.targetId))
            .limit(1);
          if (commentRow) {
            targetPreview = {
              label:
                commentRow.text.length > 120
                  ? `${commentRow.text.slice(0, 120)}…`
                  : commentRow.text,
              authorId: commentRow.authorId,
              authorName: commentRow.displayName,
              authorEmail: commentRow.email,
              missing: false,
            };
          } else {
            targetPreview.missing = true;
          }
        } else if (row.targetType === "user") {
          const [userRow] = await db
            .select({
              displayName: user.displayName,
              email: user.email,
            })
            .from(user)
            .where(eq(user.id, row.targetId))
            .limit(1);
          if (userRow) {
            targetPreview = {
              label: userRow.displayName ?? userRow.email ?? row.targetId,
              authorId: row.targetId,
              authorName: userRow.displayName,
              authorEmail: userRow.email,
              missing: false,
            };
          } else {
            targetPreview.missing = true;
          }
        }

        return {
          id: row.id,
          target_type: row.targetType,
          target_id: row.targetId,
          reason: row.reason,
          note: row.note,
          status: row.status,
          created_at: row.createdAt.toISOString(),
          resolved_at: row.resolvedAt ? row.resolvedAt.toISOString() : null,
          reporter: {
            id: row.reporterId,
            display_name: row.reporterDisplayName,
            email: row.reporterEmail,
          },
          target_preview: targetPreview,
        };
      })
    );

    return {
      data,
      pagination: {
        page: currentPage,
        pageSize: currentSize,
        total: totalResult.count,
      },
    };
  },

  async resolveReport(reportId: string, adminUserId: string) {
    const [updated] = await db
      .update(reports)
      .set({
        status: "resolved",
        resolvedBy: adminUserId,
        resolvedAt: new Date(),
      })
      .where(eq(reports.id, reportId))
      .returning({ id: reports.id });
    return { success: !!updated, error: updated ? null : "Report not found" };
  },

  async dismissReport(reportId: string, adminUserId: string) {
    const [updated] = await db
      .update(reports)
      .set({
        status: "dismissed",
        resolvedBy: adminUserId,
        resolvedAt: new Date(),
      })
      .where(eq(reports.id, reportId))
      .returning({ id: reports.id });
    return { success: !!updated, error: updated ? null : "Report not found" };
  },

  async resolveAllReportsForTarget(
    targetType: string,
    targetId: string,
    adminUserId: string
  ) {
    await db
      .update(reports)
      .set({
        status: "resolved",
        resolvedBy: adminUserId,
        resolvedAt: new Date(),
      })
      .where(
        and(
          eq(reports.targetType, targetType),
          eq(reports.targetId, targetId),
          eq(reports.status, "open")
        )
      );
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
