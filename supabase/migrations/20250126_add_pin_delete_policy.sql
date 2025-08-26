-- Pin sahiplerinin kendi pinlerini silebilmesi için politika ekle
CREATE POLICY "Users can delete own pins" ON pins FOR DELETE USING (auth.uid() = user_id);
