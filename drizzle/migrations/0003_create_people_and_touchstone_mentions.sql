CREATE TABLE public.people (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  people_touchstone_id uuid NULL REFERENCES public.touchstones(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON COLUMN public.people.user_id IS 'Owner user id. Plain uuid by platform convention; no foreign key to auth.users.';

CREATE UNIQUE INDEX people_user_lower_name_key ON public.people (user_id, lower(name));
CREATE INDEX people_user_id_idx ON public.people (user_id);
CREATE INDEX people_people_touchstone_id_idx ON public.people (people_touchstone_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.people TO authenticated;
GRANT ALL ON public.people TO service_role;

ALTER TABLE public.people ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select own people"
  ON public.people FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own people"
  ON public.people FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own people"
  ON public.people FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own people"
  ON public.people FOR DELETE TO authenticated
  USING (user_id = auth.uid());

CREATE TABLE public.touchstone_mentions (
  touchstone_id uuid NOT NULL REFERENCES public.touchstones(id) ON DELETE CASCADE,
  person_id uuid NOT NULL REFERENCES public.people(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (touchstone_id, person_id)
);

CREATE INDEX touchstone_mentions_person_id_idx ON public.touchstone_mentions (person_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.touchstone_mentions TO authenticated;
GRANT ALL ON public.touchstone_mentions TO service_role;

ALTER TABLE public.touchstone_mentions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select own mentions"
  ON public.touchstone_mentions FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.touchstones t
      WHERE t.id = public.touchstone_mentions.touchstone_id
        AND t.user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM public.people p
      WHERE p.id = public.touchstone_mentions.person_id
        AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own mentions"
  ON public.touchstone_mentions FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.touchstones t
      WHERE t.id = public.touchstone_mentions.touchstone_id
        AND t.user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM public.people p
      WHERE p.id = public.touchstone_mentions.person_id
        AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own mentions"
  ON public.touchstone_mentions FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.touchstones t
      WHERE t.id = public.touchstone_mentions.touchstone_id
        AND t.user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM public.people p
      WHERE p.id = public.touchstone_mentions.person_id
        AND p.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.touchstones t
      WHERE t.id = public.touchstone_mentions.touchstone_id
        AND t.user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM public.people p
      WHERE p.id = public.touchstone_mentions.person_id
        AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own mentions"
  ON public.touchstone_mentions FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.touchstones t
      WHERE t.id = public.touchstone_mentions.touchstone_id
        AND t.user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM public.people p
      WHERE p.id = public.touchstone_mentions.person_id
        AND p.user_id = auth.uid()
    )
  );