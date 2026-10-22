import "server-only";
import { alias } from "drizzle-orm/pg-core";
import {
  and,
  count,
  desc,
  eq,
  ilike,
  isNotNull,
  isNull,
  or,
  sql,
  type SQL,
} from "drizzle-orm";
import { db } from "@/server/db";
import { lockPinOfComment } from "@/server/services/pins/comments";
import { user } from "@/server/db/schema/auth";
import {
  adminAuditLogs,
  comments,
  pins,
  pushTokens,
  reports,
  userStats,
} from "@/server/db/schema/app";
import { HttpError } from "@/server/http/api-helpers";
import { deleteUploadByUrl } from "@/server/uploads";
import { deleteAccount } from "@/server/services/users/account";
import {
  iso,
  isoRequired,
  toPhotoMetadata,
  toUserSummary,
} from "@/server/services/users/mappers";
import type {
  AdminAnalytics,
  AdminComment,
  AdminNotificationLog,
  AdminPage,
  AdminPin,
  AdminReport,
  AdminReportStatus,
  AdminUser,
  ReportReason,
  ReportTargetType,
  SendNotificationResult,
} from "@/types/userTypes";

type ListParams = { limit: number; offset: number; q?: string };

function page<T>(items: T[], total: number, { limit, offset }: ListParams): AdminPage<T> {
  const hasMore = offset + items.length < total;
  return {
    items,
    has_more: hasMore,
    next_offset: hasMore ? offset + limit : null,
    total,
  };
}

function likePattern(q: string) {
  return `%${q.replace(/[\\%_]/g, (ch) => `\\${ch}`)}%`;
}

function authorWithEmail(
  row: {
    id: string | null;
    displayName: string | null;
    avatarUrl: string | null;
    deletedAt: Date | null;
    email: string | null;
  } | null
) {
  if (!row?.id) return null;
  return {
    ...toUserSummary({ ...row, id: row.id }),
    email: row.deletedAt ? null : row.email,
  };
}

// ---------------------------------------------------------------------------
// Lists
// ---------------------------------------------------------------------------

export async function listUsers(params: ListParams): Promise<AdminPage<AdminUser>> {
  const where = params.q
    ? or(ilike(user.email, likePattern(params.q)), ilike(user.displayName, likePattern(params.q)))
    : undefined;

  const [[{ total }], rows] = await Promise.all([
    db.select({ total: count() }).from(user).where(where),
    db
      .select({
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        role: user.role,
        emailVerified: user.emailVerified,
        createdAt: user.createdAt,
        deletedAt: user.deletedAt,
        // Spelled out: in a single-table select drizzle renders columns
        // unqualified, so `${pushTokens.userId} = ${user.id}` became
        // "user_id" = "id" and matched push_tokens against itself (always 0).
        activeTokens: sql<number>`(SELECT COUNT(*)::int FROM push_tokens pt WHERE pt.user_id = "user"."id" AND pt.is_active)`,
      })
      .from(user)
      .where(where)
      .orderBy(desc(user.createdAt), desc(user.id))
      .limit(params.limit)
      .offset(params.offset),
  ]);

  return page(
    rows.map((r) => ({
      id: r.id,
      email: r.email,
      display_name: r.displayName,
      avatar_url: r.avatarUrl,
      role: r.role === "admin" ? "admin" : "user",
      email_verified: r.emailVerified,
      created_at: isoRequired(r.createdAt),
      deleted_at: iso(r.deletedAt),
      active_push_tokens: Number(r.activeTokens) || 0,
    })),
    Number(total),
    params
  );
}

export async function listPins(params: ListParams): Promise<AdminPage<AdminPin>> {
  const where = params.q ? ilike(pins.name, likePattern(params.q)) : undefined;
  const [[{ total }], rows] = await Promise.all([
    db.select({ total: count() }).from(pins).where(where),
    db
      .select({
        id: pins.id,
        name: pins.name,
        lat: sql<number>`ST_Y(${pins.location})`,
        lng: sql<number>`ST_X(${pins.location})`,
        createdAt: pins.createdAt,
        commentsCount: pins.commentsCount,
        userId: user.id,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        deletedAt: user.deletedAt,
        email: user.email,
      })
      .from(pins)
      .leftJoin(user, eq(user.id, pins.userId))
      .where(where)
      .orderBy(desc(pins.createdAt), desc(pins.id))
      .limit(params.limit)
      .offset(params.offset),
  ]);

  return page(
    rows.map((r) => ({
      id: r.id,
      name: r.name,
      lat: Number(r.lat),
      lng: Number(r.lng),
      created_at: isoRequired(r.createdAt),
      comments_count: Number(r.commentsCount) || 0,
      user: authorWithEmail({ ...r, id: r.userId }) ?? {
        id: "",
        display_name: null,
        avatar_url: null,
        email: null,
      },
    })),
    Number(total),
    params
  );
}

export async function listComments(
  params: ListParams
): Promise<AdminPage<AdminComment>> {
  const where = params.q ? ilike(comments.text, likePattern(params.q)) : undefined;
  const [[{ total }], rows] = await Promise.all([
    db.select({ total: count() }).from(comments).where(where),
    db
      .select({
        id: comments.id,
        text: comments.text,
        photoUrl: comments.photoUrl,
        photoMetadata: comments.photoMetadata,
        isFirstComment: comments.isFirstComment,
        createdAt: comments.createdAt,
        pinId: comments.pinId,
        pinName: pins.name,
        userId: user.id,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        deletedAt: user.deletedAt,
        email: user.email,
      })
      .from(comments)
      .leftJoin(pins, eq(pins.id, comments.pinId))
      .leftJoin(user, eq(user.id, comments.userId))
      .where(where)
      .orderBy(desc(comments.createdAt), desc(comments.id))
      .limit(params.limit)
      .offset(params.offset),
  ]);

  return page(
    rows.map((r) => ({
      id: r.id,
      text: r.text,
      photo_url: r.photoUrl,
      photo_metadata: toPhotoMetadata(r.photoMetadata),
      is_first_comment: r.isFirstComment,
      created_at: isoRequired(r.createdAt),
      pin: { id: r.pinId, name: r.pinName ?? "" },
      user: authorWithEmail({ ...r, id: r.userId }) ?? {
        id: "",
        display_name: null,
        avatar_url: null,
        email: null,
      },
    })),
    Number(total),
    params
  );
}

// ---------------------------------------------------------------------------
// Moderation actions
// ---------------------------------------------------------------------------

/** Delete a pin with all its comments and their photos. False if missing. */
export async function deletePin(pinId: string): Promise<boolean> {
  const photoRows = await db
    .select({ photoUrl: comments.photoUrl })
    .from(comments)
    .where(and(eq(comments.pinId, pinId), isNotNull(comments.photoUrl)));
  const deleted = await db
    .delete(pins)
    .where(eq(pins.id, pinId))
    .returning({ id: pins.id });
  if (deleted.length === 0) return false;
  await Promise.all(photoRows.map((r) => deleteUploadByUrl(r.photoUrl)));
  return true;
}

/**
 * Delete one comment (and its photo). When it was the pin's last comment
 * the DB trigger removes the pin too. Null when the comment doesn't exist.
 */
export async function deleteComment(
  commentId: string
): Promise<{ pin_deleted: boolean; pin_id: string } | null> {
  const deleted = await db.transaction(async (tx) => {
    await lockPinOfComment(tx, commentId);
    const [row] = await tx
      .delete(comments)
      .where(eq(comments.id, commentId))
      .returning({ pinId: comments.pinId, photoUrl: comments.photoUrl });
    return row;
  });
  if (!deleted) return null;
  await deleteUploadByUrl(deleted.photoUrl);
  const [pin] = await db
    .select({ id: pins.id })
    .from(pins)
    .where(eq(pins.id, deleted.pinId))
    .limit(1);
  return { pin_deleted: !pin, pin_id: deleted.pinId };
}

/**
 * Admin "ban": soft-deletes the account exactly like self-deletion. Admins
 * can't delete themselves here or other admins (demote first, in the DB).
 */
export async function deleteUser(actorId: string, targetId: string) {
  if (actorId === targetId) {
    throw HttpError.forbidden("Use account settings to delete your own account");
  }
  const [target] = await db
    .select({ role: user.role })
    .from(user)
    .where(eq(user.id, targetId))
    .limit(1);
  if (!target) throw HttpError.notFound("User not found");
  if (target.role === "admin") {
    throw HttpError.forbidden("Admins cannot be deleted");
  }
  await deleteAccount(targetId);
}

/** Recompute user_stats for everyone via the SQL function. */
export async function refreshAllUserStats(): Promise<void> {
  await db.execute(sql`SELECT populate_user_stats()`);
}

// ---------------------------------------------------------------------------
// Analytics
// ---------------------------------------------------------------------------

export async function getAnalytics(): Promise<AdminAnalytics> {
  const [
    [users],
    [pinCount],
    [commentCount],
    [votes],
    [openReports],
    [tokens],
    daily,
    topUsers,
  ] = await Promise.all([
    db
      .select({
        total: count(),
        deleted: sql<number>`COUNT(${user.deletedAt})::int`,
      })
      .from(user),
    db.select({ n: count() }).from(pins),
    db.select({ n: count() }).from(comments),
    db
      .select({
        likes: sql<number>`COALESCE(SUM(${userStats.totalLikesReceived}), 0)::int`,
        dislikes: sql<number>`COALESCE(SUM(${userStats.totalDislikesReceived}), 0)::int`,
      })
      .from(userStats),
    db.select({ n: count() }).from(reports).where(eq(reports.status, "open")),
    db.select({ n: count() }).from(pushTokens).where(eq(pushTokens.isActive, true)),
    db.execute<{ date: string; pins: number; comments: number; users: number }>(sql`
      WITH days AS (
        SELECT generate_series(current_date - 13, current_date, interval '1 day')::date AS d
      )
      SELECT to_char(days.d, 'YYYY-MM-DD') AS date,
        (SELECT COUNT(*)::int FROM pins WHERE created_at::date = days.d) AS pins,
        (SELECT COUNT(*)::int FROM comments WHERE created_at::date = days.d) AS comments,
        (SELECT COUNT(*)::int FROM "user" WHERE created_at::date = days.d) AS users
      FROM days ORDER BY days.d
    `),
    db
      .select({
        id: user.id,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        deletedAt: user.deletedAt,
        totalPins: userStats.totalPins,
        totalComments: userStats.totalComments,
        likes: userStats.totalLikesReceived,
      })
      .from(userStats)
      .innerJoin(user, eq(user.id, userStats.userId))
      .where(isNull(user.deletedAt))
      .orderBy(desc(userStats.totalPins), desc(userStats.totalComments))
      .limit(5),
  ]);

  return {
    total_users: Number(users.total) - Number(users.deleted),
    deleted_users: Number(users.deleted),
    total_pins: Number(pinCount.n),
    total_comments: Number(commentCount.n),
    total_likes: Number(votes.likes),
    total_dislikes: Number(votes.dislikes),
    open_reports: Number(openReports.n),
    active_push_tokens: Number(tokens.n),
    daily: [...daily].map((d) => ({
      date: String(d.date),
      pins: Number(d.pins),
      comments: Number(d.comments),
      users: Number(d.users),
    })),
    top_users: topUsers.map((u) => ({
      ...toUserSummary(u),
      total_pins: u.totalPins,
      total_comments: u.totalComments,
      total_likes_received: u.likes,
    })),
  };
}

// ---------------------------------------------------------------------------
// Reports
// ---------------------------------------------------------------------------

export async function listReports(
  params: ListParams & { status: AdminReportStatus | "all" }
): Promise<AdminPage<AdminReport>> {
  const reporter = alias(user, "reporter");
  const pinAuthor = alias(user, "pin_author");
  const commentAuthor = alias(user, "comment_author");
  const targetUser = alias(user, "target_user");

  const where: SQL | undefined =
    params.status === "all" ? undefined : eq(reports.status, params.status);

  const [[{ total }], rows] = await Promise.all([
    db.select({ total: count() }).from(reports).where(where),
    db
      .select({
        id: reports.id,
        targetType: reports.targetType,
        targetId: reports.targetId,
        reason: reports.reason,
        note: reports.note,
        status: reports.status,
        createdAt: reports.createdAt,
        resolvedAt: reports.resolvedAt,
        reporter: {
          id: reporter.id,
          displayName: reporter.displayName,
          avatarUrl: reporter.avatarUrl,
          deletedAt: reporter.deletedAt,
          email: reporter.email,
        },
        pinName: pins.name,
        pinAuthor: {
          id: pinAuthor.id,
          displayName: pinAuthor.displayName,
          avatarUrl: pinAuthor.avatarUrl,
          deletedAt: pinAuthor.deletedAt,
          email: pinAuthor.email,
        },
        commentText: comments.text,
        commentAuthor: {
          id: commentAuthor.id,
          displayName: commentAuthor.displayName,
          avatarUrl: commentAuthor.avatarUrl,
          deletedAt: commentAuthor.deletedAt,
          email: commentAuthor.email,
        },
        targetUser: {
          id: targetUser.id,
          displayName: targetUser.displayName,
          avatarUrl: targetUser.avatarUrl,
          deletedAt: targetUser.deletedAt,
          email: targetUser.email,
        },
      })
      .from(reports)
      .leftJoin(reporter, eq(reporter.id, reports.reporterId))
      .leftJoin(pins, and(eq(reports.targetType, "pin"), eq(pins.id, reports.targetId)))
      .leftJoin(pinAuthor, eq(pinAuthor.id, pins.userId))
      .leftJoin(
        comments,
        and(eq(reports.targetType, "comment"), eq(comments.id, reports.targetId))
      )
      .leftJoin(commentAuthor, eq(commentAuthor.id, comments.userId))
      .leftJoin(
        targetUser,
        and(eq(reports.targetType, "user"), eq(targetUser.id, reports.targetId))
      )
      .where(where)
      .orderBy(desc(reports.createdAt), desc(reports.id))
      .limit(params.limit)
      .offset(params.offset),
  ]);

  const items = rows.map((r): AdminReport => {
    let label: string | null = null;
    let author = null;
    if (r.targetType === "pin") {
      label = r.pinName;
      author = authorWithEmail(r.pinAuthor);
    } else if (r.targetType === "comment") {
      label =
        r.commentText && r.commentText.length > 160
          ? `${r.commentText.slice(0, 160)}…`
          : r.commentText;
      author = authorWithEmail(r.commentAuthor);
    } else {
      author = authorWithEmail(r.targetUser);
      label = author?.display_name ?? null;
    }
    const missing =
      r.targetType === "pin"
        ? r.pinName === null
        : r.targetType === "comment"
          ? r.commentText === null
          : !r.targetUser?.id || !!r.targetUser.deletedAt;
    return {
      id: r.id,
      target_type: r.targetType as ReportTargetType,
      target_id: r.targetId,
      reason: r.reason as ReportReason,
      note: r.note,
      status: r.status as AdminReportStatus,
      created_at: isoRequired(r.createdAt),
      resolved_at: iso(r.resolvedAt),
      reporter: authorWithEmail(r.reporter),
      target: { label, author, missing },
    };
  });

  return page(items, Number(total), params);
}

export async function getReport(reportId: string) {
  const [row] = await db
    .select({ id: reports.id, targetType: reports.targetType, targetId: reports.targetId })
    .from(reports)
    .where(eq(reports.id, reportId))
    .limit(1);
  return row ?? null;
}

export async function setReportStatus(
  reportId: string,
  status: Exclude<AdminReportStatus, "open">,
  adminUserId: string
): Promise<boolean> {
  const updated = await db
    .update(reports)
    .set({ status, resolvedBy: adminUserId, resolvedAt: new Date() })
    .where(eq(reports.id, reportId))
    .returning({ id: reports.id });
  return updated.length > 0;
}

export async function resolveAllReportsForTarget(
  targetType: string,
  targetId: string,
  adminUserId: string
) {
  await db
    .update(reports)
    .set({ status: "resolved", resolvedBy: adminUserId, resolvedAt: new Date() })
    .where(
      and(
        eq(reports.targetType, targetType),
        eq(reports.targetId, targetId),
        eq(reports.status, "open")
      )
    );
}

// ---------------------------------------------------------------------------
// Notification log (from the audit log)
// ---------------------------------------------------------------------------

export async function listNotificationLogs(
  params: ListParams
): Promise<AdminPage<AdminNotificationLog>> {
  const where = eq(adminAuditLogs.action, "admin.notification.send");
  const [[{ total }], rows] = await Promise.all([
    db.select({ total: count() }).from(adminAuditLogs).where(where),
    db
      .select({
        id: adminAuditLogs.id,
        actorEmail: adminAuditLogs.actorEmail,
        targetType: adminAuditLogs.targetType,
        targetId: adminAuditLogs.targetId,
        metadata: adminAuditLogs.metadata,
        createdAt: adminAuditLogs.createdAt,
      })
      .from(adminAuditLogs)
      .where(where)
      .orderBy(desc(adminAuditLogs.createdAt))
      .limit(params.limit)
      .offset(params.offset),
  ]);

  return page(
    rows.map((r) => {
      const m = (r.metadata ?? {}) as Record<string, unknown>;
      const num = (v: unknown) => (typeof v === "number" ? v : Number(v) || 0);
      const hasResult = m.sent !== undefined || m.recipient_count !== undefined || m.recipientCount !== undefined;
      const result: SendNotificationResult | null = hasResult
        ? {
            recipient_count: num(m.recipient_count ?? m.recipientCount),
            sent: num(m.sent),
            failed: num(m.failed),
            deactivated: num(m.deactivated),
          }
        : null;
      return {
        id: r.id,
        actor_email: r.actorEmail,
        target_type: r.targetType,
        target_id: r.targetId,
        title: typeof m.title === "string" ? m.title : null,
        body: typeof m.body === "string" ? m.body : null,
        result,
        created_at: isoRequired(r.createdAt),
      };
    }),
    Number(total),
    params
  );
}

/** Compatibility namespace for older imports. */
export const adminService = {
  listUsers,
  listPins,
  listComments,
  deletePin,
  deleteComment,
  deleteUser,
  refreshAllUserStats,
  getAnalytics,
  listReports,
  getReport,
  setReportStatus,
  resolveAllReportsForTarget,
  listNotificationLogs,
};
