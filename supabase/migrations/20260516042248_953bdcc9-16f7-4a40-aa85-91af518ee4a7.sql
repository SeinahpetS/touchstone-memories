-- Create private exports bucket for user data exports
INSERT INTO storage.buckets (id, name, public)
VALUES ('exports', 'exports', false)
ON CONFLICT (id) DO NOTHING;

-- RLS: only allow users to read their own export files (signed URLs bypass RLS,
-- but this prevents direct unauthorized access)
CREATE POLICY "Users can read their own exports"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'exports'
  AND auth.uid()::text = (storage.foldername(name))[1]
);
