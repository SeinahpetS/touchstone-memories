CREATE TABLE public.story_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text,
  transcript text NOT NULL DEFAULT '',
  extracted_artifacts jsonb NOT NULL DEFAULT '[]'::jsonb,
  highlight_spans jsonb NOT NULL DEFAULT '[]'::jsonb,
  confirmed_artifact_ids uuid[] NOT NULL DEFAULT ARRAY[]::uuid[],
  status text NOT NULL DEFAULT 'incomplete' CHECK (status IN ('incomplete','complete')),
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '24 hours')
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.story_sessions TO authenticated;
GRANT ALL ON public.story_sessions TO service_role;

ALTER TABLE public.story_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users select own story sessions"
  ON public.story_sessions FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own story sessions"
  ON public.story_sessions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own story sessions"
  ON public.story_sessions FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own story sessions"
  ON public.story_sessions FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX idx_story_sessions_user_id ON public.story_sessions(user_id);
CREATE INDEX idx_story_sessions_expires_at ON public.story_sessions(expires_at);

-- Auto-derive title from transcript and set expires_at based on subscription tier
CREATE OR REPLACE FUNCTION public.set_story_session_defaults()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_vivid boolean;
BEGIN
  -- Auto-generate title from first 50 chars of transcript if not provided
  IF NEW.title IS NULL OR NEW.title = '' THEN
    NEW.title := NULLIF(left(coalesce(NEW.transcript, ''), 50), '');
  END IF;

  -- Set expires_at based on subscription tier on insert
  IF TG_OP = 'INSERT' THEN
    is_vivid := public.has_active_vivid(NEW.user_id);
    NEW.expires_at := NEW.created_at + (CASE WHEN is_vivid THEN interval '7 days' ELSE interval '24 hours' END);
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_story_sessions_defaults
BEFORE INSERT OR UPDATE ON public.story_sessions
FOR EACH ROW
EXECUTE FUNCTION public.set_story_session_defaults();