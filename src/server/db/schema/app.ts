import {
  pgTable,
  text,
  timestamp,
  boolean,
  smallint,
  integer,
  jsonb,
  uniqueIndex,
  index,
  customType,
  check,
  primaryKey,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { user } from "./auth";

/**
 * PostGIS point in WGS84. Kept as a custom type (instead of drizzle's
 * `geometry()`) so the column type matches the existing DB exactly. Always
 * read coordinates with ST_Y/ST_X in SQL; never select the raw column.
 */
const geometryPoint = customType<{ data: string; driverData: string }>({
  dataType() {
    return "GEOMETRY(POINT, 4326)";
  },
});

const tstz = (name: string) => timestamp(name, { withTimezone: true });

/**
 * Pins. `comments_count` is maintained by triggers on `comments` (see
 * drizzle/0009_*). A pin whose last comment is deleted is deleted by trigger.
 */
export const pins = pgTable(
  "pins",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    location: geometryPoint("location").notNull(),
    commentsCount: integer("comments_count").notNull().default(0),
    createdAt: tstz("created_at").notNull().defaultNow(),
    updatedAt: tstz("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("idx_pins_location").using("gist", table.location),
    index("idx_pins_created_at").on(table.createdAt),
    index("idx_pins_user_created").on(table.userId, table.createdAt.desc()),
    index("idx_pins_name_trgm").using("gin", table.name.op("gin_trgm_ops")),
  ]
);

/**
 * Comments. `likes_count` / `dislikes_count` are maintained by triggers on
 * `comment_votes`.
 */
export const comments = pgTable(
  "comments",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    pinId: text("pin_id")
      .notNull()
      .references(() => pins.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    text: text("text").notNull(),
    isFirstComment: boolean("is_first_comment").notNull().default(false),
    photoUrl: text("photo_url"),
    photoMetadata: jsonb("photo_metadata").default(sql`'{}'::jsonb`),
    likesCount: integer("likes_count").notNull().default(0),
    dislikesCount: integer("dislikes_count").notNull().default(0),
    likeNotifiedCount: integer("like_notified_count").notNull().default(0),
    likeNotifiedAt: tstz("like_notified_at"),
    createdAt: tstz("created_at").notNull().defaultNow(),
    updatedAt: tstz("updated_at").notNull().defaultNow(),
  },
  (table) => [
    // (user_id, pin_id) also serves "comments by user" lookups.
    uniqueIndex("unique_user_comment_per_pin").on(table.userId, table.pinId),
    index("idx_comments_created_at").on(table.createdAt),
    // Serves "comments of pin" lookups and the pin FK cascade.
    index("idx_comments_pin_created").on(table.pinId, table.createdAt.desc()),
    index("idx_comments_user_created").on(table.userId, table.createdAt.desc()),
  ]
);

// Comment votes. (comment_id, user_id) unique index serves comment lookups.
export const commentVotes = pgTable(
  "comment_votes",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    commentId: text("comment_id")
      .notNull()
      .references(() => comments.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    value: smallint("value").notNull(),
    createdAt: tstz("created_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("unique_comment_vote_per_user").on(
      table.commentId,
      table.userId
    ),
    index("idx_comment_votes_user_id").on(table.userId),
    check("comment_votes_value_check", sql`${table.value} in (-1, 1)`),
  ]
);

/**
 * One row per (comment, liker) that already produced a "liked your comment"
 * push, so like/unlike toggling can never notify twice.
 */
export const commentLikeNotifications = pgTable(
  "comment_like_notifications",
  {
    commentId: text("comment_id")
      .notNull()
      .references(() => comments.id, { onDelete: "cascade" }),
    likerId: text("liker_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: tstz("created_at").notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.commentId, table.likerId] }),
    index("idx_comment_like_notifications_liker").on(table.likerId),
  ]
);

// User stats table (denormalized, maintained by triggers)
export const userStats = pgTable(
  "user_stats",
  {
    userId: text("user_id")
      .primaryKey()
      .references(() => user.id, { onDelete: "cascade" }),
    totalPins: integer("total_pins").notNull().default(0),
    totalComments: integer("total_comments").notNull().default(0),
    totalLikesReceived: integer("total_likes_received").notNull().default(0),
    totalDislikesReceived: integer("total_dislikes_received")
      .notNull()
      .default(0),
    totalVotesGiven: integer("total_votes_given").notNull().default(0),
    lastActivityAt: tstz("last_activity_at").notNull().defaultNow(),
    updatedAt: tstz("updated_at").notNull().defaultNow(),
  },
  (table) => [
    // Admin "top users" ORDER BY total_pins DESC LIMIT n.
    index("idx_user_stats_total_pins").on(table.totalPins),
  ]
);

// Push notification tokens
export const pushTokens = pgTable(
  "push_tokens",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    token: text("token").notNull(),
    platform: text("platform").notNull(),
    deviceName: text("device_name"),
    isActive: boolean("is_active").notNull().default(true),
    lastSeenAt: tstz("last_seen_at").notNull().defaultNow(),
    createdAt: tstz("created_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("unique_push_token").on(table.token),
    index("idx_push_tokens_user").on(table.userId),
  ]
);

export const userFollows = pgTable(
  "user_follows",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    followerId: text("follower_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    followingId: text("following_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: tstz("created_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("unique_user_follow").on(table.followerId, table.followingId),
    index("idx_user_follows_follower_created").on(
      table.followerId,
      table.createdAt.desc()
    ),
    index("idx_user_follows_following_created").on(
      table.followingId,
      table.createdAt.desc()
    ),
    check(
      "user_follows_no_self",
      sql`${table.followerId} <> ${table.followingId}`
    ),
  ]
);

// Reports — user-submitted moderation flags on pins, comments, or users
export const reports = pgTable(
  "reports",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    reporterId: text("reporter_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    targetType: text("target_type").notNull(),
    targetId: text("target_id").notNull(),
    reason: text("reason").notNull(),
    note: text("note"),
    status: text("status").notNull().default("open"),
    resolvedBy: text("resolved_by").references(() => user.id, {
      onDelete: "set null",
    }),
    resolvedAt: tstz("resolved_at"),
    createdAt: tstz("created_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("uniq_report_per_reporter_target").on(
      table.reporterId,
      table.targetType,
      table.targetId
    ),
    index("idx_reports_status_created").on(
      table.status,
      table.createdAt.desc()
    ),
    index("idx_reports_target").on(table.targetType, table.targetId),
    check(
      "reports_target_type_check",
      sql`${table.targetType} in ('pin', 'comment', 'user')`
    ),
    check(
      "reports_status_check",
      sql`${table.status} in ('open', 'resolved', 'dismissed')`
    ),
  ]
);

// User blocks — bidirectional content visibility cut.
// PK (blocker_id, blocked_id) serves blocker lookups.
export const userBlocks = pgTable(
  "user_blocks",
  {
    blockerId: text("blocker_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    blockedId: text("blocked_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: tstz("created_at").notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.blockerId, table.blockedId] }),
    check(
      "user_blocks_no_self",
      sql`${table.blockerId} <> ${table.blockedId}`
    ),
    index("idx_user_blocks_blocked").on(table.blockedId),
  ]
);

// Admin audit logs
export const adminAuditLogs = pgTable(
  "admin_audit_logs",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    actorId: text("actor_id").notNull(),
    actorEmail: text("actor_email"),
    action: text("action").notNull(),
    targetType: text("target_type").notNull(),
    targetId: text("target_id"),
    metadata: jsonb("metadata").default(sql`'{}'::jsonb`),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    createdAt: tstz("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("idx_admin_audit_actor").on(table.actorId),
    index("idx_admin_audit_target").on(table.targetType, table.targetId),
    index("idx_admin_audit_created").on(table.createdAt),
    index("idx_admin_audit_metadata_gin").using("gin", table.metadata),
  ]
);
