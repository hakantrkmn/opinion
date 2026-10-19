import {
  pgTable,
  text,
  timestamp,
  boolean,
  index,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// better-auth core tables (drizzle adapter, model names = table names).
// All timestamps are timestamptz; drizzle maps them to/from JS Date, which is
// what better-auth reads and writes.
const tstz = (name: string) => timestamp(name, { withTimezone: true });

export const user = pgTable(
  "user",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull().unique(),
    emailVerified: boolean("email_verified").notNull().default(false),
    image: text("image"),
    createdAt: tstz("created_at").notNull().defaultNow(),
    updatedAt: tstz("updated_at").notNull().defaultNow(),
    // Custom fields
    displayName: text("display_name"),
    avatarUrl: text("avatar_url"),
    role: text("role").notNull().default("user"),
    /** Soft-delete marker set by account deletion (see 0007). */
    deletedAt: tstz("deleted_at"),
  },
  (table) => [
    index("idx_user_deleted_at")
      .on(table.deletedAt)
      .where(sql`${table.deletedAt} IS NOT NULL`),
    // User search uses `display_name ILIKE '%q%'`.
    index("idx_user_display_name_trgm").using(
      "gin",
      table.displayName.op("gin_trgm_ops")
    ),
  ]
);

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: tstz("expires_at").notNull(),
    token: text("token").notNull().unique(),
    createdAt: tstz("created_at").notNull().defaultNow(),
    updatedAt: tstz("updated_at").notNull().defaultNow(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [index("idx_session_user_id").on(table.userId)]
);

export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: tstz("access_token_expires_at"),
    refreshTokenExpiresAt: tstz("refresh_token_expires_at"),
    scope: text("scope"),
    password: text("password"),
    createdAt: tstz("created_at").notNull().defaultNow(),
    updatedAt: tstz("updated_at").notNull().defaultNow(),
  },
  (table) => [index("idx_account_user_id").on(table.userId)]
);

export const verification = pgTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: tstz("expires_at").notNull(),
    createdAt: tstz("created_at"),
    updatedAt: tstz("updated_at"),
  },
  (table) => [index("idx_verification_identifier").on(table.identifier)]
);
