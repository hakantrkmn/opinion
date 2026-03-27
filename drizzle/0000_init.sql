-- Enable PostGIS
CREATE EXTENSION IF NOT EXISTS postgis;

-- =============================================
-- TABLES
-- =============================================

CREATE TABLE IF NOT EXISTS "user" (
  "id" text PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "email" text NOT NULL UNIQUE,
  "email_verified" boolean NOT NULL DEFAULT false,
  "image" text,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now(),
  "display_name" text,
  "avatar_url" text,
  "role" text NOT NULL DEFAULT 'user'
);

CREATE TABLE IF NOT EXISTS "session" (
  "id" text PRIMARY KEY NOT NULL,
  "expires_at" timestamp NOT NULL,
  "token" text NOT NULL UNIQUE,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now(),
  "ip_address" text,
  "user_agent" text,
  "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "account" (
  "id" text PRIMARY KEY NOT NULL,
  "account_id" text NOT NULL,
  "provider_id" text NOT NULL,
  "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "access_token" text,
  "refresh_token" text,
  "id_token" text,
  "access_token_expires_at" timestamp,
  "refresh_token_expires_at" timestamp,
  "scope" text,
  "password" text,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "verification" (
  "id" text PRIMARY KEY NOT NULL,
  "identifier" text NOT NULL,
  "value" text NOT NULL,
  "expires_at" timestamp NOT NULL,
  "created_at" timestamp,
  "updated_at" timestamp
);

CREATE TABLE IF NOT EXISTS "pins" (
  "id" text PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "name" text NOT NULL,
  "location" GEOMETRY(POINT, 4326) NOT NULL,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "comments" (
  "id" text PRIMARY KEY NOT NULL,
  "pin_id" text NOT NULL REFERENCES "pins"("id") ON DELETE CASCADE,
  "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "text" text NOT NULL,
  "is_first_comment" boolean NOT NULL DEFAULT false,
  "photo_url" text,
  "photo_metadata" jsonb DEFAULT '{}'::jsonb,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "comment_votes" (
  "id" text PRIMARY KEY NOT NULL,
  "comment_id" text NOT NULL REFERENCES "comments"("id") ON DELETE CASCADE,
  "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "value" smallint NOT NULL,
  "created_at" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "user_stats" (
  "user_id" text PRIMARY KEY REFERENCES "user"("id") ON DELETE CASCADE,
  "total_pins" integer NOT NULL DEFAULT 0,
  "total_comments" integer NOT NULL DEFAULT 0,
  "total_likes_received" integer NOT NULL DEFAULT 0,
  "total_dislikes_received" integer NOT NULL DEFAULT 0,
  "total_votes_given" integer NOT NULL DEFAULT 0,
  "last_activity_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "cleanup_logs" (
  "id" text PRIMARY KEY NOT NULL,
  "table_name" text NOT NULL,
  "action" text NOT NULL,
  "count" integer NOT NULL DEFAULT 0,
  "created_at" timestamp NOT NULL DEFAULT now()
);

-- =============================================
-- INDEXES
-- =============================================

CREATE UNIQUE INDEX IF NOT EXISTS "unique_user_comment_per_pin" ON "comments" ("user_id", "pin_id");
CREATE UNIQUE INDEX IF NOT EXISTS "unique_comment_vote_per_user" ON "comment_votes" ("comment_id", "user_id");

CREATE INDEX IF NOT EXISTS "idx_pins_user_id" ON "pins" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_pins_created_at" ON "pins" ("created_at");
CREATE INDEX IF NOT EXISTS "idx_pins_location" ON "pins" USING GIST ("location");
CREATE INDEX IF NOT EXISTS "idx_pins_name_fts" ON "pins" USING GIN (to_tsvector('turkish', "name"));

CREATE INDEX IF NOT EXISTS "idx_comments_pin_id" ON "comments" ("pin_id");
CREATE INDEX IF NOT EXISTS "idx_comments_user_id" ON "comments" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_comments_created_at" ON "comments" ("created_at");
CREATE INDEX IF NOT EXISTS "idx_comments_is_first" ON "comments" ("is_first_comment");

CREATE INDEX IF NOT EXISTS "idx_comment_votes_comment_id" ON "comment_votes" ("comment_id");
CREATE INDEX IF NOT EXISTS "idx_comment_votes_user_id" ON "comment_votes" ("user_id");

CREATE INDEX IF NOT EXISTS "idx_user_stats_total_pins" ON "user_stats" ("total_pins");
CREATE INDEX IF NOT EXISTS "idx_user_stats_total_comments" ON "user_stats" ("total_comments");
CREATE INDEX IF NOT EXISTS "idx_user_stats_last_activity" ON "user_stats" ("last_activity_at");

-- =============================================
-- TRIGGER FUNCTIONS
-- =============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_pins_updated_at ON pins;
CREATE TRIGGER update_pins_updated_at BEFORE UPDATE ON pins
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_comments_updated_at ON comments;
CREATE TRIGGER update_comments_updated_at BEFORE UPDATE ON comments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Pin cleanup when last comment is deleted
CREATE OR REPLACE FUNCTION check_pin_after_comment_deletion()
RETURNS TRIGGER AS $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM comments WHERE pin_id = OLD.pin_id) THEN
        DELETE FROM pins WHERE id = OLD.pin_id;
    END IF;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS check_pin_after_comment_deletion_trigger ON comments;
CREATE TRIGGER check_pin_after_comment_deletion_trigger
    AFTER DELETE ON comments
    FOR EACH ROW EXECUTE FUNCTION check_pin_after_comment_deletion();

-- Initialize user stats on user creation
CREATE OR REPLACE FUNCTION initialize_user_stats()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO user_stats (user_id) VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS initialize_user_stats_trigger ON "user";
CREATE TRIGGER initialize_user_stats_trigger
    AFTER INSERT ON "user"
    FOR EACH ROW EXECUTE FUNCTION initialize_user_stats();

-- User stats updated_at
CREATE OR REPLACE FUNCTION update_user_stats_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_user_stats_updated_at_trigger ON user_stats;
CREATE TRIGGER update_user_stats_updated_at_trigger
    BEFORE UPDATE ON user_stats
    FOR EACH ROW EXECUTE FUNCTION update_user_stats_updated_at();

-- =============================================
-- STATISTICS TRIGGERS
-- =============================================

CREATE OR REPLACE FUNCTION update_pin_stats()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO user_stats (user_id, total_pins, last_activity_at)
        VALUES (NEW.user_id, 1, NOW())
        ON CONFLICT (user_id) DO UPDATE SET
            total_pins = user_stats.total_pins + 1,
            last_activity_at = NOW();
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE user_stats SET total_pins = GREATEST(0, total_pins - 1) WHERE user_id = OLD.user_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_pin_stats_insert_trigger ON pins;
CREATE TRIGGER update_pin_stats_insert_trigger AFTER INSERT ON pins
    FOR EACH ROW EXECUTE FUNCTION update_pin_stats();
DROP TRIGGER IF EXISTS update_pin_stats_delete_trigger ON pins;
CREATE TRIGGER update_pin_stats_delete_trigger AFTER DELETE ON pins
    FOR EACH ROW EXECUTE FUNCTION update_pin_stats();

CREATE OR REPLACE FUNCTION update_comment_stats()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO user_stats (user_id, total_comments, last_activity_at)
        VALUES (NEW.user_id, 1, NOW())
        ON CONFLICT (user_id) DO UPDATE SET
            total_comments = user_stats.total_comments + 1,
            last_activity_at = NOW();
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE user_stats SET total_comments = GREATEST(0, total_comments - 1) WHERE user_id = OLD.user_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_comment_stats_insert_trigger ON comments;
CREATE TRIGGER update_comment_stats_insert_trigger AFTER INSERT ON comments
    FOR EACH ROW EXECUTE FUNCTION update_comment_stats();
DROP TRIGGER IF EXISTS update_comment_stats_delete_trigger ON comments;
CREATE TRIGGER update_comment_stats_delete_trigger AFTER DELETE ON comments
    FOR EACH ROW EXECUTE FUNCTION update_comment_stats();

CREATE OR REPLACE FUNCTION update_vote_stats()
RETURNS TRIGGER AS $$
DECLARE
    comment_author_id TEXT;
BEGIN
    IF TG_OP = 'INSERT' THEN
        SELECT user_id INTO comment_author_id FROM comments WHERE id = NEW.comment_id;
        INSERT INTO user_stats (user_id, total_votes_given, last_activity_at)
        VALUES (NEW.user_id, 1, NOW())
        ON CONFLICT (user_id) DO UPDATE SET
            total_votes_given = user_stats.total_votes_given + 1,
            last_activity_at = NOW();
        IF comment_author_id IS NOT NULL THEN
            IF NEW.value = 1 THEN
                INSERT INTO user_stats (user_id, total_likes_received) VALUES (comment_author_id, 1)
                ON CONFLICT (user_id) DO UPDATE SET total_likes_received = user_stats.total_likes_received + 1;
            ELSE
                INSERT INTO user_stats (user_id, total_dislikes_received) VALUES (comment_author_id, 1)
                ON CONFLICT (user_id) DO UPDATE SET total_dislikes_received = user_stats.total_dislikes_received + 1;
            END IF;
        END IF;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        SELECT user_id INTO comment_author_id FROM comments WHERE id = OLD.comment_id;
        UPDATE user_stats SET total_votes_given = GREATEST(0, total_votes_given - 1) WHERE user_id = OLD.user_id;
        IF comment_author_id IS NOT NULL THEN
            IF OLD.value = 1 THEN
                UPDATE user_stats SET total_likes_received = GREATEST(0, total_likes_received - 1) WHERE user_id = comment_author_id;
            ELSE
                UPDATE user_stats SET total_dislikes_received = GREATEST(0, total_dislikes_received - 1) WHERE user_id = comment_author_id;
            END IF;
        END IF;
        RETURN OLD;
    ELSIF TG_OP = 'UPDATE' THEN
        SELECT user_id INTO comment_author_id FROM comments WHERE id = NEW.comment_id;
        IF comment_author_id IS NOT NULL AND OLD.value != NEW.value THEN
            IF OLD.value = 1 THEN
                UPDATE user_stats SET total_likes_received = GREATEST(0, total_likes_received - 1) WHERE user_id = comment_author_id;
            ELSE
                UPDATE user_stats SET total_dislikes_received = GREATEST(0, total_dislikes_received - 1) WHERE user_id = comment_author_id;
            END IF;
            IF NEW.value = 1 THEN
                UPDATE user_stats SET total_likes_received = total_likes_received + 1 WHERE user_id = comment_author_id;
            ELSE
                UPDATE user_stats SET total_dislikes_received = total_dislikes_received + 1 WHERE user_id = comment_author_id;
            END IF;
        END IF;
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_vote_stats_insert_trigger ON comment_votes;
CREATE TRIGGER update_vote_stats_insert_trigger AFTER INSERT ON comment_votes
    FOR EACH ROW EXECUTE FUNCTION update_vote_stats();
DROP TRIGGER IF EXISTS update_vote_stats_delete_trigger ON comment_votes;
CREATE TRIGGER update_vote_stats_delete_trigger AFTER DELETE ON comment_votes
    FOR EACH ROW EXECUTE FUNCTION update_vote_stats();
DROP TRIGGER IF EXISTS update_vote_stats_update_trigger ON comment_votes;
CREATE TRIGGER update_vote_stats_update_trigger AFTER UPDATE ON comment_votes
    FOR EACH ROW EXECUTE FUNCTION update_vote_stats();

-- =============================================
-- RPC FUNCTIONS
-- =============================================

DROP FUNCTION IF EXISTS get_pins_in_bounds(double precision, double precision, double precision, double precision);
CREATE OR REPLACE FUNCTION get_pins_in_bounds(
  min_lat DOUBLE PRECISION, max_lat DOUBLE PRECISION,
  min_lng DOUBLE PRECISION, max_lng DOUBLE PRECISION
)
RETURNS TABLE (
  id TEXT, user_id TEXT, name TEXT, location JSONB,
  created_at TIMESTAMP, updated_at TIMESTAMP,
  user_display_name TEXT, user_avatar_url TEXT, comments_count BIGINT
) LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT p.id, p.user_id, p.name, ST_AsGeoJSON(p.location)::jsonb as location, p.created_at, p.updated_at,
    u.display_name,
    u.avatar_url,
    COALESCE(c.comment_count, 0) as comments_count
  FROM pins p
  LEFT JOIN "user" u ON p.user_id = u.id
  LEFT JOIN (SELECT pin_id, COUNT(*) as comment_count FROM comments GROUP BY pin_id) c ON p.id = c.pin_id
  WHERE ST_Within(p.location, ST_MakeEnvelope(min_lng, min_lat, max_lng, max_lat, 4326))
  ORDER BY p.created_at DESC;
END;
$$;

DROP FUNCTION IF EXISTS search_pins(text);
CREATE OR REPLACE FUNCTION search_pins(search_term TEXT)
RETURNS TABLE (
  id TEXT, name TEXT, location JSONB, user_id TEXT,
  created_at TIMESTAMP, comment_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT p.id, p.name, ST_AsGeoJSON(p.location)::jsonb as location, p.user_id, p.created_at,
    COUNT(c.id)::BIGINT as comment_count
  FROM pins p
  LEFT JOIN comments c ON p.id = c.pin_id
  WHERE to_tsvector('turkish', p.name) @@ plainto_tsquery('turkish', search_term)
  GROUP BY p.id, p.name, p.location, p.user_id, p.created_at
  ORDER BY p.created_at DESC;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION populate_user_stats()
RETURNS void AS $$
DECLARE
    user_record RECORD;
BEGIN
    FOR user_record IN SELECT id FROM "user" LOOP
        INSERT INTO user_stats (user_id, total_pins, total_comments, total_likes_received, total_dislikes_received, total_votes_given, last_activity_at)
        VALUES (
            user_record.id,
            (SELECT COUNT(*) FROM pins WHERE user_id = user_record.id),
            (SELECT COUNT(*) FROM comments WHERE user_id = user_record.id),
            (SELECT COUNT(*) FROM comment_votes cv JOIN comments c ON cv.comment_id = c.id WHERE c.user_id = user_record.id AND cv.value = 1),
            (SELECT COUNT(*) FROM comment_votes cv JOIN comments c ON cv.comment_id = c.id WHERE c.user_id = user_record.id AND cv.value = -1),
            (SELECT COUNT(*) FROM comment_votes WHERE user_id = user_record.id),
            GREATEST(
                COALESCE((SELECT MAX(created_at) FROM pins WHERE user_id = user_record.id), '1970-01-01'::timestamp),
                COALESCE((SELECT MAX(created_at) FROM comments WHERE user_id = user_record.id), '1970-01-01'::timestamp)
            )
        )
        ON CONFLICT (user_id) DO UPDATE SET
            total_pins = EXCLUDED.total_pins,
            total_comments = EXCLUDED.total_comments,
            total_likes_received = EXCLUDED.total_likes_received,
            total_dislikes_received = EXCLUDED.total_dislikes_received,
            total_votes_given = EXCLUDED.total_votes_given,
            last_activity_at = EXCLUDED.last_activity_at,
            updated_at = NOW();
    END LOOP;
END;
$$ LANGUAGE plpgsql;
