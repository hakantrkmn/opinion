-- Updated at trigger fonksiyonu
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Updated at trigger'ları
CREATE TRIGGER update_pins_updated_at BEFORE UPDATE ON pins
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_comments_updated_at BEFORE UPDATE ON comments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Yorum silindiğinde pin kontrolü
CREATE OR REPLACE FUNCTION check_pin_after_comment_deletion()
RETURNS TRIGGER AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM comments WHERE pin_id = OLD.pin_id
    ) THEN
        DELETE FROM pins WHERE id = OLD.pin_id;
    END IF;
    RETURN OLD;
END;
$$ language 'plpgsql';

CREATE TRIGGER check_pin_after_comment_deletion_trigger
    AFTER DELETE ON comments
    FOR EACH ROW EXECUTE FUNCTION check_pin_after_comment_deletion();

-- Pin ve ilk yorumu birlikte oluşturma fonksiyonu
CREATE OR REPLACE FUNCTION create_pin_with_comment(
  pin_name TEXT,
  pin_lat DOUBLE PRECISION,
  pin_lng DOUBLE PRECISION,
  first_comment_text TEXT
)
RETURNS UUID AS $$
DECLARE
  new_pin_id UUID;
BEGIN
  INSERT INTO pins (user_id, name, location)
  VALUES (auth.uid(), pin_name, ST_Point(pin_lng, pin_lat))
  RETURNING id INTO new_pin_id;

  INSERT INTO comments (pin_id, user_id, text, is_first_comment)
  VALUES (new_pin_id, auth.uid(), first_comment_text, TRUE);

  RETURN new_pin_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Pin arama fonksiyonu
CREATE OR REPLACE FUNCTION search_pins(search_term TEXT)
RETURNS TABLE (
  id UUID,
  name TEXT,
  location GEOMETRY,
  user_id UUID,
  created_at TIMESTAMP,
  comment_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.name,
    p.location,
    p.user_id,
    p.created_at,
    COUNT(c.id)::BIGINT as comment_count
  FROM pins p
  LEFT JOIN comments c ON p.id = c.pin_id
  WHERE to_tsvector('turkish', p.name) @@ plainto_tsquery('turkish', search_term)
  GROUP BY p.id, p.name, p.location, p.user_id, p.created_at
  ORDER BY p.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
