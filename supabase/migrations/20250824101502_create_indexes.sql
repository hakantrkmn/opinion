-- Spatial index (harita sorguları için en önemli)
CREATE INDEX idx_pins_location ON pins USING GIST (location);

-- B-tree index'ler (hızlı arama için)
CREATE INDEX idx_pins_user_id ON pins (user_id);
CREATE INDEX idx_pins_created_at ON pins (created_at);
CREATE INDEX idx_pins_name ON pins USING GIN (to_tsvector('turkish', name));

CREATE INDEX idx_comments_pin_id ON comments (pin_id);
CREATE INDEX idx_comments_user_id ON comments (user_id);
CREATE INDEX idx_comments_created_at ON comments (created_at);
CREATE INDEX idx_comments_is_first ON comments (is_first_comment);

CREATE INDEX idx_comment_votes_comment_id ON comment_votes (comment_id);
CREATE INDEX idx_comment_votes_user_id ON comment_votes (user_id);
