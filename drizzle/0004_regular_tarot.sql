ALTER TABLE "comments" ADD COLUMN "like_notified_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "comments" ADD COLUMN "like_notified_at" timestamp;