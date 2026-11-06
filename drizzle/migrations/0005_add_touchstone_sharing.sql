ALTER TABLE public.touchstones
  ADD COLUMN source_touchstone_id uuid NULL,
  ADD COLUMN received_from_user_id uuid NULL,
  ADD COLUMN received_from_name text NULL,
  ADD COLUMN received_note text NULL;

CREATE TABLE public.touchstone_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  touchstone_id uuid NOT NULL REFERENCES public.touchstones(id) ON DELETE CASCADE,
  person_id uuid NULL REFERENCES public.people(id) ON DELETE SET NULL,
  token text NOT NULL UNIQUE DEFAULT encode(extensions.gen_random_bytes(24), 'hex'),
  include_note boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'kept', 'expired')),
  kept_by_user_id uuid NULL,
  kept_touchstone_id uuid NULL,
  expires_at timestamptz NOT NULL DEFAULT now() + interval '14 days',
  created_at timestamptz DEFAULT now()
);
GRANT SELECT, INSERT ON public.touchstone_shares TO authenticated;
GRANT ALL ON public.touchstone_shares TO service_role;
ALTER TABLE public.touchstone_shares ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Senders read own shares"
ON public.touchstone_shares FOR SELECT TO authenticated
USING (from_user_id = auth.uid());

CREATE POLICY "Senders insert own touchstone shares"
ON public.touchstone_shares FOR INSERT TO authenticated
WITH CHECK (
  from_user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.touchstones t
    WHERE t.id = touchstone_shares.touchstone_id AND t.user_id = auth.uid()
  )
);
