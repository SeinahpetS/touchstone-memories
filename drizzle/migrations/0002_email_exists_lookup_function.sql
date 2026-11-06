-- Look up whether an email already has an account, for the create-account screen.
-- Read-only, returns a boolean, and executable by service_role only so the browser
-- cannot call it directly through the Data API.
create or replace function public.email_exists(p_email text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from auth.users where lower(email) = lower(trim(p_email))
  );
$$;

revoke all on function public.email_exists(text) from public, anon, authenticated;
grant execute on function public.email_exists(text) to service_role;