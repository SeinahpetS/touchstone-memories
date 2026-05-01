ALTER TABLE public.touchstones
  ADD COLUMN IF NOT EXISTS source_url TEXT,
  ADD COLUMN IF NOT EXISTS imprint_subtype TEXT;