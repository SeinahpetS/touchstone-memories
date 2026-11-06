ALTER TABLE public.people
  ADD CONSTRAINT people_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES public.profiles(id)
  ON DELETE CASCADE;