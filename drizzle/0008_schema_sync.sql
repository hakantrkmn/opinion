-- 0008: bring the drizzle schema and the real DB back in sync, convert all
-- timestamps to timestamptz (existing values are UTC wall-clock), add
-- denormalized counter columns (filled + maintained in 0009), add hot-path
-- indexes and drop redundant ones.
CREATE EXTENSION IF NOT EXISTS pg_trgm;
--> statement-breakpoint
-- Legacy RPCs: replaced by inline queries in src/server/services/pins (and
-- their TIMESTAMP return types would no longer match the columns).
DROP FUNCTION IF EXISTS get_pins_in_bounds(double precision, double precision, double precision, double precision);
--> statement-breakpoint
DROP FUNCTION IF EXISTS get_followed_pins_in_bounds(text, double precision, double precision, double precision, double precision);
--> statement-breakpoint
DROP FUNCTION IF EXISTS search_pins(text);
--> statement-breakpoint
-- Unused FTS index (search_pins was its only user); trigram index replaces it.
DROP INDEX IF EXISTS "idx_pins_name_fts";
--> statement-breakpoint
-- Unused table.
DROP TABLE IF EXISTS "cleanup_logs" CASCADE;
--> statement-breakpoint
CREATE TABLE "comment_like_notifications" (
	"comment_id" text NOT NULL,
	"liker_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "comment_like_notifications_comment_id_liker_id_pk" PRIMARY KEY("comment_id","liker_id")
);
--> statement-breakpoint
DROP INDEX IF EXISTS "idx_comment_votes_comment_id";
--> statement-breakpoint
DROP INDEX IF EXISTS "idx_comments_pin_id";
--> statement-breakpoint
DROP INDEX IF EXISTS "idx_comments_user_id";
--> statement-breakpoint
DROP INDEX IF EXISTS "idx_comments_is_first";
--> statement-breakpoint
DROP INDEX IF EXISTS "idx_pins_user_id";
--> statement-breakpoint
DROP INDEX IF EXISTS "idx_push_tokens_active";
--> statement-breakpoint
DROP INDEX IF EXISTS "idx_user_blocks_blocker";
--> statement-breakpoint
DROP INDEX IF EXISTS "idx_user_stats_total_comments";
--> statement-breakpoint
DROP INDEX IF EXISTS "idx_user_stats_last_activity";
--> statement-breakpoint
ALTER TABLE "admin_audit_logs" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone USING "created_at" AT TIME ZONE 'UTC';
--> statement-breakpoint
ALTER TABLE "admin_audit_logs" ALTER COLUMN "created_at" SET DEFAULT now();
--> statement-breakpoint
ALTER TABLE "comment_votes" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone USING "created_at" AT TIME ZONE 'UTC';
--> statement-breakpoint
ALTER TABLE "comment_votes" ALTER COLUMN "created_at" SET DEFAULT now();
--> statement-breakpoint
ALTER TABLE "comments" ALTER COLUMN "like_notified_at" SET DATA TYPE timestamp with time zone USING "like_notified_at" AT TIME ZONE 'UTC';
--> statement-breakpoint
ALTER TABLE "comments" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone USING "created_at" AT TIME ZONE 'UTC';
--> statement-breakpoint
ALTER TABLE "comments" ALTER COLUMN "created_at" SET DEFAULT now();
--> statement-breakpoint
ALTER TABLE "comments" ALTER COLUMN "updated_at" SET DATA TYPE timestamp with time zone USING "updated_at" AT TIME ZONE 'UTC';
--> statement-breakpoint
ALTER TABLE "comments" ALTER COLUMN "updated_at" SET DEFAULT now();
--> statement-breakpoint
ALTER TABLE "pins" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone USING "created_at" AT TIME ZONE 'UTC';
--> statement-breakpoint
ALTER TABLE "pins" ALTER COLUMN "created_at" SET DEFAULT now();
--> statement-breakpoint
ALTER TABLE "pins" ALTER COLUMN "updated_at" SET DATA TYPE timestamp with time zone USING "updated_at" AT TIME ZONE 'UTC';
--> statement-breakpoint
ALTER TABLE "pins" ALTER COLUMN "updated_at" SET DEFAULT now();
--> statement-breakpoint
ALTER TABLE "push_tokens" ALTER COLUMN "last_seen_at" SET DATA TYPE timestamp with time zone USING "last_seen_at" AT TIME ZONE 'UTC';
--> statement-breakpoint
ALTER TABLE "push_tokens" ALTER COLUMN "last_seen_at" SET DEFAULT now();
--> statement-breakpoint
ALTER TABLE "push_tokens" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone USING "created_at" AT TIME ZONE 'UTC';
--> statement-breakpoint
ALTER TABLE "push_tokens" ALTER COLUMN "created_at" SET DEFAULT now();
--> statement-breakpoint
ALTER TABLE "reports" ALTER COLUMN "resolved_at" SET DATA TYPE timestamp with time zone USING "resolved_at" AT TIME ZONE 'UTC';
--> statement-breakpoint
ALTER TABLE "reports" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone USING "created_at" AT TIME ZONE 'UTC';
--> statement-breakpoint
ALTER TABLE "reports" ALTER COLUMN "created_at" SET DEFAULT now();
--> statement-breakpoint
ALTER TABLE "user_blocks" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone USING "created_at" AT TIME ZONE 'UTC';
--> statement-breakpoint
ALTER TABLE "user_blocks" ALTER COLUMN "created_at" SET DEFAULT now();
--> statement-breakpoint
ALTER TABLE "user_follows" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone USING "created_at" AT TIME ZONE 'UTC';
--> statement-breakpoint
ALTER TABLE "user_follows" ALTER COLUMN "created_at" SET DEFAULT now();
--> statement-breakpoint
ALTER TABLE "user_stats" ALTER COLUMN "last_activity_at" SET DATA TYPE timestamp with time zone USING "last_activity_at" AT TIME ZONE 'UTC';
--> statement-breakpoint
ALTER TABLE "user_stats" ALTER COLUMN "last_activity_at" SET DEFAULT now();
--> statement-breakpoint
ALTER TABLE "user_stats" ALTER COLUMN "updated_at" SET DATA TYPE timestamp with time zone USING "updated_at" AT TIME ZONE 'UTC';
--> statement-breakpoint
ALTER TABLE "user_stats" ALTER COLUMN "updated_at" SET DEFAULT now();
--> statement-breakpoint
ALTER TABLE "account" ALTER COLUMN "access_token_expires_at" SET DATA TYPE timestamp with time zone USING "access_token_expires_at" AT TIME ZONE 'UTC';
--> statement-breakpoint
ALTER TABLE "account" ALTER COLUMN "refresh_token_expires_at" SET DATA TYPE timestamp with time zone USING "refresh_token_expires_at" AT TIME ZONE 'UTC';
--> statement-breakpoint
ALTER TABLE "account" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone USING "created_at" AT TIME ZONE 'UTC';
--> statement-breakpoint
ALTER TABLE "account" ALTER COLUMN "created_at" SET DEFAULT now();
--> statement-breakpoint
ALTER TABLE "account" ALTER COLUMN "updated_at" SET DATA TYPE timestamp with time zone USING "updated_at" AT TIME ZONE 'UTC';
--> statement-breakpoint
ALTER TABLE "account" ALTER COLUMN "updated_at" SET DEFAULT now();
--> statement-breakpoint
ALTER TABLE "session" ALTER COLUMN "expires_at" SET DATA TYPE timestamp with time zone USING "expires_at" AT TIME ZONE 'UTC';
--> statement-breakpoint
ALTER TABLE "session" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone USING "created_at" AT TIME ZONE 'UTC';
--> statement-breakpoint
ALTER TABLE "session" ALTER COLUMN "created_at" SET DEFAULT now();
--> statement-breakpoint
ALTER TABLE "session" ALTER COLUMN "updated_at" SET DATA TYPE timestamp with time zone USING "updated_at" AT TIME ZONE 'UTC';
--> statement-breakpoint
ALTER TABLE "session" ALTER COLUMN "updated_at" SET DEFAULT now();
--> statement-breakpoint
ALTER TABLE "user" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone USING "created_at" AT TIME ZONE 'UTC';
--> statement-breakpoint
ALTER TABLE "user" ALTER COLUMN "created_at" SET DEFAULT now();
--> statement-breakpoint
ALTER TABLE "user" ALTER COLUMN "updated_at" SET DATA TYPE timestamp with time zone USING "updated_at" AT TIME ZONE 'UTC';
--> statement-breakpoint
ALTER TABLE "user" ALTER COLUMN "updated_at" SET DEFAULT now();
--> statement-breakpoint
ALTER TABLE "verification" ALTER COLUMN "expires_at" SET DATA TYPE timestamp with time zone USING "expires_at" AT TIME ZONE 'UTC';
--> statement-breakpoint
ALTER TABLE "verification" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone USING "created_at" AT TIME ZONE 'UTC';
--> statement-breakpoint
ALTER TABLE "verification" ALTER COLUMN "updated_at" SET DATA TYPE timestamp with time zone USING "updated_at" AT TIME ZONE 'UTC';
--> statement-breakpoint
ALTER TABLE "comments" ADD COLUMN "likes_count" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE "comments" ADD COLUMN "dislikes_count" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE "pins" ADD COLUMN "comments_count" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp;
--> statement-breakpoint
ALTER TABLE "user" ALTER COLUMN "deleted_at" SET DATA TYPE timestamp with time zone USING "deleted_at" AT TIME ZONE 'UTC';
--> statement-breakpoint
ALTER TABLE "comment_like_notifications" ADD CONSTRAINT "comment_like_notifications_comment_id_comments_id_fk" FOREIGN KEY ("comment_id") REFERENCES "public"."comments"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "comment_like_notifications" ADD CONSTRAINT "comment_like_notifications_liker_id_user_id_fk" FOREIGN KEY ("liker_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "idx_comment_like_notifications_liker" ON "comment_like_notifications" USING btree ("liker_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_pins_location" ON "pins" USING gist ("location");
--> statement-breakpoint
CREATE INDEX "idx_pins_name_trgm" ON "pins" USING gin ("name" gin_trgm_ops);
--> statement-breakpoint
CREATE INDEX "idx_account_user_id" ON "account" USING btree ("user_id");
--> statement-breakpoint
CREATE INDEX "idx_session_user_id" ON "session" USING btree ("user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_user_deleted_at" ON "user" USING btree ("deleted_at") WHERE "user"."deleted_at" IS NOT NULL;
--> statement-breakpoint
CREATE INDEX "idx_user_display_name_trgm" ON "user" USING gin ("display_name" gin_trgm_ops);
--> statement-breakpoint
CREATE INDEX "idx_verification_identifier" ON "verification" USING btree ("identifier");
--> statement-breakpoint
ALTER TABLE "comment_votes" ADD CONSTRAINT "comment_votes_value_check" CHECK ("comment_votes"."value" in (-1, 1));
--> statement-breakpoint
-- 0000_init created FK / unique constraints with Postgres default names;
-- rename them to the names drizzle-kit expects so push/check see no drift.
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN SELECT * FROM (VALUES
    ('account', 'account_user_id_fkey', 'account_user_id_user_id_fk'),
    ('session', 'session_user_id_fkey', 'session_user_id_user_id_fk'),
    ('session', 'session_token_key', 'session_token_unique'),
    ('user', 'user_email_key', 'user_email_unique'),
    ('pins', 'pins_user_id_fkey', 'pins_user_id_user_id_fk'),
    ('comments', 'comments_pin_id_fkey', 'comments_pin_id_pins_id_fk'),
    ('comments', 'comments_user_id_fkey', 'comments_user_id_user_id_fk'),
    ('comment_votes', 'comment_votes_comment_id_fkey', 'comment_votes_comment_id_comments_id_fk'),
    ('comment_votes', 'comment_votes_user_id_fkey', 'comment_votes_user_id_user_id_fk'),
    ('user_stats', 'user_stats_user_id_fkey', 'user_stats_user_id_user_id_fk')
  ) AS t(tbl, old_name, new_name)
  LOOP
    IF EXISTS (
      SELECT 1 FROM pg_constraint c JOIN pg_class k ON k.oid = c.conrelid
      WHERE k.relname = r.tbl AND c.conname = r.old_name
    ) THEN
      EXECUTE format('ALTER TABLE %I RENAME CONSTRAINT %I TO %I', r.tbl, r.old_name, r.new_name);
    END IF;
  END LOOP;
END $$;
