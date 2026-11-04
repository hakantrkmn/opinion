ALTER TABLE "comments" ADD COLUMN "verified_visit" boolean DEFAULT false NOT NULL;--> statement-breakpoint
-- A pin's first comment was posted through POST /api/pins, which already
-- requires being within the create distance.
UPDATE "comments" SET "verified_visit" = true WHERE "is_first_comment";
