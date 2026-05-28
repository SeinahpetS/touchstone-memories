
-- 1) Restrict avatar storage policies to authenticated users only
DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own avatar" ON storage.objects;

CREATE POLICY "Users can upload their own avatar"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'avatars' AND (auth.uid())::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own avatar"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'avatars' AND (auth.uid())::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own avatar"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'avatars' AND (auth.uid())::text = (storage.foldername(name))[1]);

-- 2) Remove broad SELECT (listing) policies on public buckets.
-- Files remain accessible via their public CDN URLs; clients just can't list bucket contents.
DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view memory photos" ON storage.objects;

-- 3) Prevent users from self-promoting subscription/billing fields on profiles.
-- Trigger blocks updates to billing-related columns unless performed by service_role.
CREATE OR REPLACE FUNCTION public.prevent_profile_billing_updates()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF current_setting('request.jwt.claim.role', true) = 'service_role'
     OR current_user = 'service_role' THEN
    RETURN NEW;
  END IF;

  IF NEW.tier IS DISTINCT FROM OLD.tier
     OR NEW.subscription_status IS DISTINCT FROM OLD.subscription_status
     OR NEW.subscription_price_id IS DISTINCT FROM OLD.subscription_price_id
     OR NEW.stripe_customer_id IS DISTINCT FROM OLD.stripe_customer_id
     OR NEW.stripe_subscription_id IS DISTINCT FROM OLD.stripe_subscription_id
     OR NEW.stripe_env IS DISTINCT FROM OLD.stripe_env
     OR NEW.current_period_end IS DISTINCT FROM OLD.current_period_end
     OR NEW.cancel_at_period_end IS DISTINCT FROM OLD.cancel_at_period_end
     OR NEW.trial_started_at IS DISTINCT FROM OLD.trial_started_at
     OR NEW.trial_ends_at IS DISTINCT FROM OLD.trial_ends_at
     OR NEW.vivid_since IS DISTINCT FROM OLD.vivid_since THEN
    RAISE EXCEPTION 'Billing/subscription fields can only be modified by the server';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_profile_billing_updates ON public.profiles;
CREATE TRIGGER prevent_profile_billing_updates
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.prevent_profile_billing_updates();
