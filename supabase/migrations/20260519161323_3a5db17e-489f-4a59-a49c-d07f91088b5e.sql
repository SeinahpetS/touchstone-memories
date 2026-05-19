-- 1. Add subscription fields to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS stripe_customer_id text,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id text,
  ADD COLUMN IF NOT EXISTS subscription_price_id text,
  ADD COLUMN IF NOT EXISTS subscription_status text,
  ADD COLUMN IF NOT EXISTS current_period_end timestamptz,
  ADD COLUMN IF NOT EXISTS cancel_at_period_end boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS vivid_since timestamptz,
  ADD COLUMN IF NOT EXISTS timezone text,
  ADD COLUMN IF NOT EXISTS stripe_env text;

CREATE INDEX IF NOT EXISTS idx_profiles_stripe_customer_id ON public.profiles(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_subscription_id ON public.profiles(stripe_subscription_id);

-- 2. Trigger: set trial window on insert if not already set
CREATE OR REPLACE FUNCTION public.set_default_trial()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.trial_started_at IS NULL THEN
    NEW.trial_started_at := now();
  END IF;
  IF NEW.trial_ends_at IS NULL THEN
    -- Provisional 7-day window in UTC; check-trial-status refines to user's local midnight
    NEW.trial_ends_at := NEW.trial_started_at + interval '7 days';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_default_trial_trigger ON public.profiles;
CREATE TRIGGER set_default_trial_trigger
  BEFORE INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.set_default_trial();

-- Backfill existing rows missing a trial window
UPDATE public.profiles
SET trial_started_at = COALESCE(trial_started_at, created_at, now()),
    trial_ends_at = COALESCE(trial_ends_at, COALESCE(trial_started_at, created_at, now()) + interval '7 days')
WHERE trial_started_at IS NULL OR trial_ends_at IS NULL;

-- 3. Helper: is user a Vivid subscriber OR inside their trial?
CREATE OR REPLACE FUNCTION public.has_active_vivid(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = _user_id
      AND (
        p.subscription_status IN ('active', 'trialing', 'past_due')
        OR (p.trial_ends_at IS NOT NULL AND p.trial_ends_at > now())
      )
  );
$$;