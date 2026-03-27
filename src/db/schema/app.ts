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
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { user } from "./auth";

// Custom PostGIS geometry type
const geometry = customType<{
  data: string;
  dpiType: string;
}>({
  dataType() {
    return "GEOMETRY(POINT, 4326)";
  },
  toDriver(value: string) {
    return value;
  },
  fromDriver(value: unknown) {
    return value as string;
  },
});

// Pins table
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
    location: geometry("location").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("idx_pins_user_id").on(table.userId),
    index("idx_pins_created_at").on(table.createdAt),
  ]
);

// Comments table
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
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("unique_user_comment_per_pin").on(table.userId, table.pinId),
    index("idx_comments_pin_id").on(table.pinId),
    index("idx_comments_user_id").on(table.userId),
    index("idx_comments_created_at").on(table.createdAt),
    // Partial index: only index rows where is_first_comment = true (better selectivity than full boolean index)
    index("idx_comments_is_first").on(table.pinId).where(sql`is_first_comment = true`),
  ]
);

// Comment votes table
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
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("unique_comment_vote_per_user").on(
      table.commentId,
      table.userId
    ),
    index("idx_comment_votes_comment_id").on(table.commentId),
    index("idx_comment_votes_user_id").on(table.userId),
  ]
);

// User stats table (denormalized)
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
    lastActivityAt: timestamp("last_activity_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("idx_user_stats_total_pins").on(table.totalPins),
    index("idx_user_stats_total_comments").on(table.totalComments),
    index("idx_user_stats_last_activity").on(table.lastActivityAt),
  ]
);

// Cleanup logs table
export const cleanupLogs = pgTable("cleanup_logs", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  tableName: text("table_name").notNull(),
  action: text("action").notNull(),
  count: integer("count").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
