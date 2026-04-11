CREATE TABLE "push_tokens" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"token" text NOT NULL,
	"platform" text NOT NULL,
	"device_name" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_seen_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "push_tokens" ADD CONSTRAINT "push_tokens_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "unique_push_token" ON "push_tokens" USING btree ("token");--> statement-breakpoint
CREATE INDEX "idx_push_tokens_user" ON "push_tokens" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_push_tokens_active" ON "push_tokens" USING btree ("is_active");
