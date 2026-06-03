
-- Storage policies for memory-photos (will be private), avatars (public), exports (private)

-- memory-photos: owner-only read/write/delete, folder = user_id
CREATE POLICY "memory_photos_select_own"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'memory-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "memory_photos_insert_own"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'memory-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "memory_photos_update_own"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'memory-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "memory_photos_delete_own"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'memory-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

-- avatars: public read (intent documented), owner-only writes
CREATE POLICY "avatars_public_read"
  ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id = 'avatars');

CREATE POLICY "avatars_insert_own"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "avatars_update_own"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "avatars_delete_own"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

-- exports: writes restricted to user's own folder (service role bypasses RLS as expected)
CREATE POLICY "exports_insert_own"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'exports' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "exports_delete_own"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'exports' AND (storage.foldername(name))[1] = auth.uid()::text);
