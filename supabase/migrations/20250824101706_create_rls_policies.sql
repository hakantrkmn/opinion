-- RLS aktif et
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE pins ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE comment_votes ENABLE ROW LEVEL SECURITY;

-- Users politikaları
CREATE POLICY "Anyone can view users" ON users FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON users FOR UPDATE USING (auth.uid() = id);

-- Pins politikaları (herkese açık)
CREATE POLICY "Anyone can view pins" ON pins FOR SELECT USING (true);
CREATE POLICY "Users can create pins" ON pins FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own pin names" ON pins FOR UPDATE USING (auth.uid() = user_id);
-- Pin silme sadece trigger ile otomatik olacak

-- Comments politikaları
CREATE POLICY "Anyone can view comments" ON comments FOR SELECT USING (true);
CREATE POLICY "Users can create comments" ON comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own comments" ON comments FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own comments" ON comments FOR DELETE USING (auth.uid() = user_id);

-- Comment votes politikaları
CREATE POLICY "Anyone can view votes" ON comment_votes FOR SELECT USING (true);
CREATE POLICY "Users can create votes" ON comment_votes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own votes" ON comment_votes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own votes" ON comment_votes FOR DELETE USING (auth.uid() = user_id);
