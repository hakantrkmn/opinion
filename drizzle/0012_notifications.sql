CREATE TABLE "notifications" (
	"id" text PRIMARY KEY NOT NULL,
	"recipient_id" text NOT NULL,
	"type" text NOT NULL,
	"group_key" text NOT NULL,
	"actor_id" text NOT NULL,
	"actor_ids" text[] NOT NULL,
	"pin_id" text,
	"comment_id" text,
	"count" integer DEFAULT 1 NOT NULL,
	"read_at" timestamp with time zone,
	"pushed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "notifications_type_check" CHECK ("notifications"."type" in ('pin_commented', 'comment_liked', 'followed')),
	CONSTRAINT "notifications_count_matches_actors" CHECK ("notifications"."count" = cardinality("notifications"."actor_ids") AND "notifications"."count" > 0)
);
--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_recipient_id_user_id_fk" FOREIGN KEY ("recipient_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_actor_id_user_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_pin_id_pins_id_fk" FOREIGN KEY ("pin_id") REFERENCES "public"."pins"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_comment_id_comments_id_fk" FOREIGN KEY ("comment_id") REFERENCES "public"."comments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_notifications_unread_group" ON "notifications" USING btree ("recipient_id","group_key") WHERE "notifications"."read_at" IS NULL;--> statement-breakpoint
CREATE INDEX "idx_notifications_recipient_updated" ON "notifications" USING btree ("recipient_id","updated_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_notifications_actor" ON "notifications" USING btree ("actor_id");--> statement-breakpoint
CREATE INDEX "idx_notifications_actor_ids" ON "notifications" USING gin ("actor_ids");--> statement-breakpoint
CREATE INDEX "idx_notifications_pin" ON "notifications" USING btree ("pin_id");--> statement-breakpoint
CREATE INDEX "idx_notifications_comment" ON "notifications" USING btree ("comment_id");