-- Backfill trial dates for any existing profiles created before the trigger existed.
UPDATE public.profiles
SET trial_started_at = created_at,
    trial_ends_at = created_at + interval '7 days'
WHERE trial_started_at IS NULL;