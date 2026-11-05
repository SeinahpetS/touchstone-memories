ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS country_code text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS region_code text;
COMMENT ON COLUMN public.profiles.country_code IS 'ISO alpha-2 country code from the onboarding location answer; no coordinates stored';
COMMENT ON COLUMN public.profiles.region_code IS 'Admin-1 region code from the onboarding location answer; null when no region was chosen';