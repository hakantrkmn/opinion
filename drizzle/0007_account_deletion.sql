ALTER TABLE "user" ADD COLUMN "deleted_at" timestamp;--> statement-breakpoint
CREATE INDEX "idx_user_deleted_at" ON "user" USING btree ("deleted_at") WHERE "deleted_at" IS NOT NULL;--> statement-breakpoint
CREATE OR REPLACE FUNCTION check_pin_after_comment_deletion()
RETURNS TRIGGER AS $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM comments WHERE pin_id = OLD.pin_id) THEN
        IF NOT EXISTS (
            SELECT 1
            FROM pins p
            JOIN "user" u ON u.id = p.user_id
            WHERE p.id = OLD.pin_id AND u.deleted_at IS NOT NULL
        ) THEN
            DELETE FROM pins WHERE id = OLD.pin_id;
        END IF;
    END IF;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;
