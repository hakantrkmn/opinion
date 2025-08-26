-- Pin sahiplerinin kendi pinlerini silebilmesi için politika ekle
DROP POLICY IF EXISTS "Users can delete own pins" ON pins;
CREATE POLICY "Users can delete own pins" ON pins FOR DELETE USING (auth.uid() = user_id);
