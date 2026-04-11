-- Composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS "idx_comments_pin_created"
  ON "comments" ("pin_id", "created_at" DESC);--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "idx_comments_user_created"
  ON "comments" ("user_id", "created_at" DESC);--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "idx_pins_user_created"
  ON "pins" ("user_id", "created_at" DESC);--> statement-breakpoint

-- Replace full boolean index with a smaller partial index
DROP INDEX IF EXISTS "idx_comments_is_first";--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_comments_is_first"
  ON "comments" ("pin_id") WHERE "is_first_comment" = true;--> statement-breakpoint

-- GIN index for JSONB containment queries on admin audit metadata
CREATE INDEX IF NOT EXISTS "idx_admin_audit_metadata_gin"
  ON "admin_audit_logs" USING GIN ("metadata");--> statement-breakpoint

-- Rewrite get_pins_in_bounds: use LATERAL so the comment count scan
-- is bounded to pins matched by the GIST bbox, and leverages
-- idx_comments_pin_created instead of a full table GROUP BY.
DROP FUNCTION IF EXISTS get_pins_in_bounds(double precision, double precision, double precision, double precision);--> statement-breakpoint
CREATE OR REPLACE FUNCTION get_pins_in_bounds(
  min_lat DOUBLE PRECISION, max_lat DOUBLE PRECISION,
  min_lng DOUBLE PRECISION, max_lng DOUBLE PRECISION
)
RETURNS TABLE (
  id TEXT, user_id TEXT, name TEXT, location JSONB,
  created_at TIMESTAMP, updated_at TIMESTAMP,
  user_display_name TEXT, user_avatar_url TEXT, comments_count BIGINT
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
  LEFT JOIN "user" u ON u.id = p.user_id
  LEFT JOIN LATERAL (
    SELECT COUNT(*)::bigint AS comment_count
    FROM comments c
    WHERE c.pin_id = p.id
  ) cc ON TRUE
  WHERE p.location && ST_MakeEnvelope(min_lng, min_lat, max_lng, max_lat, 4326)
    AND ST_Within(p.location, ST_MakeEnvelope(min_lng, min_lat, max_lng, max_lat, 4326))
  ORDER BY p.created_at DESC;
$$;--> statement-breakpoint

-- Scoped single-user stats refresh (replaces the JS-side 5-query aggregation)
CREATE OR REPLACE FUNCTION refresh_user_stats(target_user_id TEXT)
RETURNS void AS $$
BEGIN
  INSERT INTO user_stats (
    user_id, total_pins, total_comments,
    total_likes_received, total_dislikes_received,
    total_votes_given, last_activity_at, updated_at
  )
  VALUES (
    target_user_id,
    (SELECT COUNT(*) FROM pins WHERE user_id = target_user_id),
    (SELECT COUNT(*) FROM comments WHERE user_id = target_user_id),
    (SELECT COUNT(*) FROM comment_votes cv
       JOIN comments c ON cv.comment_id = c.id
       WHERE c.user_id = target_user_id AND cv.value = 1),
    (SELECT COUNT(*) FROM comment_votes cv
       JOIN comments c ON cv.comment_id = c.id
       WHERE c.user_id = target_user_id AND cv.value = -1),
    (SELECT COUNT(*) FROM comment_votes WHERE user_id = target_user_id),
    NOW(),
    NOW()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    total_pins = EXCLUDED.total_pins,
    total_comments = EXCLUDED.total_comments,
    total_likes_received = EXCLUDED.total_likes_received,
    total_dislikes_received = EXCLUDED.total_dislikes_received,
    total_votes_given = EXCLUDED.total_votes_given,
    last_activity_at = NOW(),
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;
