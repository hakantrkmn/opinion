-- 0009: denormalized counters + race-free pin auto-delete + correct user_stats.
--
-- Semantics
--  * pins.comments_count       = number of comments on the pin
--  * comments.likes_count      = number of +1 votes, dislikes_count = -1 votes
--  * A pin whose last comment is deleted is deleted too, regardless of who
--    owns it (also for soft-deleted owners: no more zero-comment "zombie"
--    pins). Pins of a deleted user that still have other people's comments
--    stay and are shown with a "deleted user" owner.
--  * Concurrency: inserting a comment row-locks its pin *before* the FK check
--    (BEFORE INSERT trigger), deleting a comment row-locks the pin while
--    decrementing, so "last comment deleted" and "new comment added" on the
--    same pin are serialised: either the insert sees the pin and the delete
--    sees count > 0, or the insert fails with an FK violation.
--  * Votes cascaded away together with their comment do not touch the
--    comment author's totals; the comment's own delete trigger subtracts the
--    comment's likes/dislikes from the author in one go.
--  * refresh_user_stats / populate_user_stats never bump last_activity_at.

-- 1. updated_at must only move on content edits, not on counter updates.
DROP TRIGGER IF EXISTS update_pins_updated_at ON pins;
--> statement-breakpoint
CREATE TRIGGER update_pins_updated_at
  BEFORE UPDATE OF name, location ON pins
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
--> statement-breakpoint
DROP TRIGGER IF EXISTS update_comments_updated_at ON comments;
--> statement-breakpoint
CREATE TRIGGER update_comments_updated_at
  BEFORE UPDATE OF text, photo_url, photo_metadata ON comments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
--> statement-breakpoint

-- 2. Remove the old per-row comment / vote triggers and functions.
DROP TRIGGER IF EXISTS check_pin_after_comment_deletion_trigger ON comments;
--> statement-breakpoint
DROP TRIGGER IF EXISTS update_comment_stats_insert_trigger ON comments;
--> statement-breakpoint
DROP TRIGGER IF EXISTS update_comment_stats_delete_trigger ON comments;
--> statement-breakpoint
DROP TRIGGER IF EXISTS update_vote_stats_insert_trigger ON comment_votes;
--> statement-breakpoint
DROP TRIGGER IF EXISTS update_vote_stats_delete_trigger ON comment_votes;
--> statement-breakpoint
DROP TRIGGER IF EXISTS update_vote_stats_update_trigger ON comment_votes;
--> statement-breakpoint
DROP FUNCTION IF EXISTS check_pin_after_comment_deletion();
--> statement-breakpoint
DROP FUNCTION IF EXISTS update_comment_stats();
--> statement-breakpoint
DROP FUNCTION IF EXISTS update_vote_stats();
--> statement-breakpoint

-- 3. Comment triggers.
CREATE OR REPLACE FUNCTION comments_before_insert()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  -- Row-locks the pin before the FK check runs (see header).
  UPDATE pins SET comments_count = comments_count + 1 WHERE id = NEW.pin_id;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION comments_after_insert()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO user_stats (user_id, total_comments, last_activity_at)
  VALUES (NEW.user_id, 1, now())
  ON CONFLICT (user_id) DO UPDATE SET
    total_comments = user_stats.total_comments + 1,
    last_activity_at = now();
  RETURN NULL;
END;
$$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION comments_after_delete()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  remaining integer;
BEGIN
  UPDATE user_stats SET
    total_comments = GREATEST(0, total_comments - 1),
    total_likes_received = GREATEST(0, total_likes_received - OLD.likes_count),
    total_dislikes_received = GREATEST(0, total_dislikes_received - OLD.dislikes_count)
  WHERE user_id = OLD.user_id;

  -- No-op when the pin itself is being deleted (cascade).
  UPDATE pins SET comments_count = GREATEST(0, comments_count - 1)
  WHERE id = OLD.pin_id
  RETURNING comments_count INTO remaining;

  IF FOUND AND remaining = 0 THEN
    DELETE FROM pins WHERE id = OLD.pin_id;
  END IF;
  RETURN NULL;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER comments_before_insert_trigger
  BEFORE INSERT ON comments
  FOR EACH ROW EXECUTE FUNCTION comments_before_insert();
--> statement-breakpoint
CREATE TRIGGER comments_after_insert_trigger
  AFTER INSERT ON comments
  FOR EACH ROW EXECUTE FUNCTION comments_after_insert();
--> statement-breakpoint
CREATE TRIGGER comments_after_delete_trigger
  AFTER DELETE ON comments
  FOR EACH ROW EXECUTE FUNCTION comments_after_delete();
--> statement-breakpoint

-- 4. Vote triggers.
CREATE OR REPLACE FUNCTION comment_votes_after_change()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  cid text;
  author text;
  d_like integer := 0;
  d_dislike integer := 0;
BEGIN
  IF TG_OP = 'INSERT' THEN
    cid := NEW.comment_id;
    IF NEW.value = 1 THEN d_like := 1; ELSE d_dislike := 1; END IF;
    INSERT INTO user_stats (user_id, total_votes_given, last_activity_at)
    VALUES (NEW.user_id, 1, now())
    ON CONFLICT (user_id) DO UPDATE SET
      total_votes_given = user_stats.total_votes_given + 1,
      last_activity_at = now();
  ELSIF TG_OP = 'DELETE' THEN
    cid := OLD.comment_id;
    IF OLD.value = 1 THEN d_like := -1; ELSE d_dislike := -1; END IF;
    UPDATE user_stats SET total_votes_given = GREATEST(0, total_votes_given - 1)
    WHERE user_id = OLD.user_id;
  ELSE
    IF NEW.value = OLD.value THEN RETURN NULL; END IF;
    cid := NEW.comment_id;
    d_like := (NEW.value = 1)::int - (OLD.value = 1)::int;
    d_dislike := (NEW.value = -1)::int - (OLD.value = -1)::int;
  END IF;

  -- Finds nothing when the comment is being cascade-deleted; its author's
  -- totals are then handled by comments_after_delete.
  UPDATE comments SET
    likes_count = GREATEST(0, likes_count + d_like),
    dislikes_count = GREATEST(0, dislikes_count + d_dislike)
  WHERE id = cid
  RETURNING user_id INTO author;

  IF author IS NOT NULL THEN
    UPDATE user_stats SET
      total_likes_received = GREATEST(0, total_likes_received + d_like),
      total_dislikes_received = GREATEST(0, total_dislikes_received + d_dislike)
    WHERE user_id = author;
  END IF;
  RETURN NULL;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER comment_votes_after_change_trigger
  AFTER INSERT OR UPDATE OF value OR DELETE ON comment_votes
  FOR EACH ROW EXECUTE FUNCTION comment_votes_after_change();
--> statement-breakpoint

-- 5. Repair / recompute helpers (set-based).
CREATE OR REPLACE FUNCTION recount_content_counters()
RETURNS void LANGUAGE sql AS $$
  UPDATE comments c SET
    likes_count = coalesce(v.likes, 0),
    dislikes_count = coalesce(v.dislikes, 0)
  FROM comments c2
  LEFT JOIN (
    SELECT comment_id,
           count(*) FILTER (WHERE value = 1) AS likes,
           count(*) FILTER (WHERE value = -1) AS dislikes
    FROM comment_votes GROUP BY comment_id
  ) v ON v.comment_id = c2.id
  WHERE c.id = c2.id
    AND (c.likes_count, c.dislikes_count)
        IS DISTINCT FROM (coalesce(v.likes, 0)::int, coalesce(v.dislikes, 0)::int);

  UPDATE pins p SET comments_count = coalesce(x.n, 0)
  FROM pins p2
  LEFT JOIN (SELECT pin_id, count(*) AS n FROM comments GROUP BY pin_id) x
    ON x.pin_id = p2.id
  WHERE p.id = p2.id AND p.comments_count IS DISTINCT FROM coalesce(x.n, 0)::int;
$$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION populate_user_stats()
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  PERFORM recount_content_counters();

  INSERT INTO user_stats (
    user_id, total_pins, total_comments, total_likes_received,
    total_dislikes_received, total_votes_given, last_activity_at
  )
  SELECT
    u.id,
    coalesce(p.n, 0),
    coalesce(c.n, 0),
    coalesce(c.likes, 0),
    coalesce(c.dislikes, 0),
    coalesce(v.n, 0),
    GREATEST(u.created_at, p.last_at, c.last_at, v.last_at)
  FROM "user" u
  LEFT JOIN (
    SELECT user_id, count(*) AS n, max(created_at) AS last_at
    FROM pins GROUP BY user_id
  ) p ON p.user_id = u.id
  LEFT JOIN (
    SELECT user_id, count(*) AS n, sum(likes_count) AS likes,
           sum(dislikes_count) AS dislikes, max(created_at) AS last_at
    FROM comments GROUP BY user_id
  ) c ON c.user_id = u.id
  LEFT JOIN (
    SELECT user_id, count(*) AS n, max(created_at) AS last_at
    FROM comment_votes GROUP BY user_id
  ) v ON v.user_id = u.id
  ON CONFLICT (user_id) DO UPDATE SET
    total_pins = EXCLUDED.total_pins,
    total_comments = EXCLUDED.total_comments,
    total_likes_received = EXCLUDED.total_likes_received,
    total_dislikes_received = EXCLUDED.total_dislikes_received,
    total_votes_given = EXCLUDED.total_votes_given,
    last_activity_at = EXCLUDED.last_activity_at;
END;
$$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION refresh_user_stats(target_user_id text)
RETURNS void LANGUAGE sql AS $$
  INSERT INTO user_stats (
    user_id, total_pins, total_comments, total_likes_received,
    total_dislikes_received, total_votes_given, last_activity_at
  )
  SELECT
    u.id,
    (SELECT count(*) FROM pins WHERE user_id = u.id),
    (SELECT count(*) FROM comments WHERE user_id = u.id),
    (SELECT count(*) FROM comment_votes cv JOIN comments c ON c.id = cv.comment_id
      WHERE c.user_id = u.id AND cv.value = 1),
    (SELECT count(*) FROM comment_votes cv JOIN comments c ON c.id = cv.comment_id
      WHERE c.user_id = u.id AND cv.value = -1),
    (SELECT count(*) FROM comment_votes WHERE user_id = u.id),
    GREATEST(
      u.created_at,
      (SELECT max(created_at) FROM pins WHERE user_id = u.id),
      (SELECT max(created_at) FROM comments WHERE user_id = u.id),
      (SELECT max(created_at) FROM comment_votes WHERE user_id = u.id)
    )
  FROM "user" u
  WHERE u.id = target_user_id
  ON CONFLICT (user_id) DO UPDATE SET
    total_pins = EXCLUDED.total_pins,
    total_comments = EXCLUDED.total_comments,
    total_likes_received = EXCLUDED.total_likes_received,
    total_dislikes_received = EXCLUDED.total_dislikes_received,
    total_votes_given = EXCLUDED.total_votes_given;
$$;
--> statement-breakpoint

-- 6. Backfill: drop zero-comment zombie pins, then compute every counter.
DELETE FROM pins p WHERE NOT EXISTS (SELECT 1 FROM comments c WHERE c.pin_id = p.id);
--> statement-breakpoint
SELECT populate_user_stats();
