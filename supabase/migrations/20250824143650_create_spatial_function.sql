-- supabase/migrations/20250824105000_create_spatial_function.sql
CREATE OR REPLACE FUNCTION get_pins_in_bounds(
  min_lat DOUBLE PRECISION,
  max_lat DOUBLE PRECISION,
  min_lng DOUBLE PRECISION,
  max_lng DOUBLE PRECISION
)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  name TEXT,
  location GEOMETRY,
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  user_display_name TEXT,
  comments_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.user_id,
    p.name,
    p.location,
    p.created_at,
    p.updated_at,
    u.display_name,
    COALESCE(c.comment_count, 0) as comments_count
  FROM pins p
  LEFT JOIN users u ON p.user_id = u.id
  LEFT JOIN (
    SELECT pin_id, COUNT(*) as comment_count
    FROM comments
    GROUP BY pin_id
  ) c ON p.id = c.pin_id
  WHERE ST_Within(
    p.location,
    ST_MakeEnvelope(min_lng, min_lat, max_lng, max_lat, 4326)
  )
  ORDER BY p.created_at DESC;
END;
$$;
