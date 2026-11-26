-- For the account-email function: is this email already on another account? Only the service role may call it,
-- so nobody can probe which emails have Tonight accounts.
create or replace function public.email_taken(check_email text, except_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from auth.users where lower(email) = lower(check_email) and id <> except_id);
$$;
revoke all on function public.email_taken(text, uuid) from public, anon, authenticated;
grant execute on function public.email_taken(text, uuid) to service_role;
