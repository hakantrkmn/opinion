-- Deadlock hardening for vote triggers and consistent full recounts.

-- 1. Vote trigger: lock the voter's and the author's user_stats rows in a
--    deterministic (user_id) order before touching them, so two users voting
--    on each other's comments at the same time can't deadlock.
CREATE OR REPLACE FUNCTION comment_votes_after_change()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  cid text;
  voter text;
  author text;
  d_like integer := 0;
  d_dislike integer := 0;
  d_given integer := 0;
BEGIN
  IF TG_OP = 'INSERT' THEN
    cid := NEW.comment_id;
    voter := NEW.user_id;
    d_given := 1;
    IF NEW.value = 1 THEN d_like := 1; ELSE d_dislike := 1; END IF;
  ELSIF TG_OP = 'DELETE' THEN
    cid := OLD.comment_id;
    voter := OLD.user_id;
    d_given := -1;
    IF OLD.value = 1 THEN d_like := -1; ELSE d_dislike := -1; END IF;
  ELSE
    IF NEW.value = OLD.value THEN RETURN NULL; END IF;
    cid := NEW.comment_id;
    voter := NEW.user_id;
    d_like := (NEW.value = 1)::int - (OLD.value = 1)::int;
    d_dislike := (NEW.value = -1)::int - (OLD.value = -1)::int;
  END IF;

  -- Finds nothing when the comment is being cascade-deleted; its author's
  -- totals are then handled by comments_after_delete.
  SELECT user_id INTO author FROM comments WHERE id = cid;

  IF d_given = 1 THEN
    INSERT INTO user_stats (user_id, last_activity_at)
    VALUES (voter, now())
    ON CONFLICT (user_id) DO NOTHING;
  END IF;

  PERFORM 1 FROM user_stats
  WHERE user_id IN (voter, author)
  ORDER BY user_id
  FOR UPDATE;

  IF d_given <> 0 THEN
    UPDATE user_stats SET
      total_votes_given = GREATEST(0, total_votes_given + d_given),
      last_activity_at = CASE WHEN d_given > 0 THEN now() ELSE last_activity_at END
    WHERE user_id = voter;
  END IF;

  IF author IS NOT NULL THEN
    UPDATE comments SET
      likes_count = GREATEST(0, likes_count + d_like),
      dislikes_count = GREATEST(0, dislikes_count + d_dislike)
    WHERE id = cid;

    UPDATE user_stats SET
      total_likes_received = GREATEST(0, total_likes_received + d_like),
      total_dislikes_received = GREATEST(0, total_dislikes_received + d_dislike)
    WHERE user_id = author;
  END IF;
  RETURN NULL;
END;
$$;
--> statement-breakpoint

-- 2. Full recount: block concurrent writers for the duration so aggregates
--    computed from the statement snapshot can't overwrite concurrent
--    trigger increments. Admin-only and fast (set-based).
CREATE OR REPLACE FUNCTION populate_user_stats()
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  LOCK TABLE pins, comments, comment_votes, user_stats IN SHARE ROW EXCLUSIVE MODE;

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
