ALTER TABLE public.touchstones
  ADD COLUMN IF NOT EXISTS source_session_id uuid REFERENCES public.story_sessions(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_touchstones_source_session_id ON public.touchstones(source_session_id);