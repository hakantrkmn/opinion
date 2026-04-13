CREATE TABLE "user_follows" (
	"id" text PRIMARY KEY NOT NULL,
	"follower_id" text NOT NULL,
	"following_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_follows_no_self" CHECK ("user_follows"."follower_id" <> "user_follows"."following_id")
);
--> statement-breakpoint
ALTER TABLE "user_follows" ADD CONSTRAINT "user_follows_follower_id_user_id_fk" FOREIGN KEY ("follower_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_follows" ADD CONSTRAINT "user_follows_following_id_user_id_fk" FOREIGN KEY ("following_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "unique_user_follow" ON "user_follows" USING btree ("follower_id","following_id");--> statement-breakpoint
CREATE INDEX "idx_user_follows_follower_created" ON "user_follows" USING btree ("follower_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_user_follows_following_created" ON "user_follows" USING btree ("following_id","created_at" DESC NULLS LAST);--> statement-breakpoint

DROP FUNCTION IF EXISTS get_followed_pins_in_bounds(text, double precision, double precision, double precision, double precision);--> statement-breakpoint
CREATE OR REPLACE FUNCTION get_followed_pins_in_bounds(
  requester_user_id TEXT,
  min_lat DOUBLE PRECISION,
  max_lat DOUBLE PRECISION,
  min_lng DOUBLE PRECISION,
  max_lng DOUBLE PRECISION
)
RETURNS TABLE (
  id TEXT,
  user_id TEXT,
  name TEXT,
  location JSONB,
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  user_display_name TEXT,
  user_avatar_url TEXT,
  comments_count BIGINT
) LANGUAGE sql STABLE AS $$
  SELECT
    p.id,
    p.user_id,
    p.name,
    ST_AsGeoJSON(p.location)::jsonb AS location,
    p.created_at,
    p.updated_at,
    u.display_name,
    u.avatar_url,
    COALESCE(cc.comment_count, 0) AS comments_count
  FROM pins p
  INNER JOIN user_follows uf
    ON uf.following_id = p.user_id
   AND uf.follower_id = requester_user_id
  LEFT JOIN "user" u ON u.id = p.user_id
  LEFT JOIN LATERAL (
    SELECT COUNT(*)::bigint AS comment_count
    FROM comments c
    WHERE c.pin_id = p.id
  ) cc ON TRUE
  WHERE p.location && ST_MakeEnvelope(min_lng, min_lat, max_lng, max_lat, 4326)
    AND ST_Within(p.location, ST_MakeEnvelope(min_lng, min_lat, max_lng, max_lat, 4326))
  ORDER BY p.created_at DESC;
$$;
