ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS save_offer_redeemed boolean NOT NULL DEFAULT false;