REVOKE ALL ON TABLE public.touchstone_shares FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT ON TABLE public.touchstone_shares TO authenticated;
GRANT ALL ON TABLE public.touchstone_shares TO service_role;