ALTER TABLE "pins" ADD COLUMN "community_id" text;--> statement-breakpoint
ALTER TABLE "pins" ADD CONSTRAINT "pins_community_id_communities_id_fk" FOREIGN KEY ("community_id") REFERENCES "public"."communities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_pins_community" ON "pins" USING btree ("community_id") WHERE "pins"."community_id" IS NOT NULL;