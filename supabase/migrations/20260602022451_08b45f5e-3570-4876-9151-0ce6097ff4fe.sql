CREATE OR REPLACE FUNCTION public.prevent_profile_billing_updates()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
     OR NEW.vivid_since IS DISTINCT FROM OLD.vivid_since
     OR NEW.save_offer_redeemed IS DISTINCT FROM OLD.save_offer_redeemed THEN
    RAISE EXCEPTION 'Billing/subscription fields can only be modified by the server';
  END IF;

  RETURN NEW;
END;
$function$;