-- Moderation from the testing dashboard (fortunas.nl/tonight/admin). Service role only.
-- These run the app's own moderator functions (mod_decide, mod_resolve, mod_queue) as the team's moderator
-- account, so a decision from the dashboard is logged, pushed and handled exactly like one from the app.

create or replace function public.console_as_moderator()
returns void language plpgsql security definer set search_path to ''
as $$
declare mod uuid;
begin
  select user_id into mod from app.moderators limit 1;
  if mod is null then raise exception 'no moderator account set up'; end if;
  perform set_config('request.jwt.claims', jsonb_build_object('sub', mod, 'role', 'authenticated')::text, true);
end $$;

create or replace function public.console_decide(applicant uuid, decision text, note text default null)
returns void language plpgsql security definer set search_path to ''
as $$
begin
  perform public.console_as_moderator();
  perform public.mod_decide(applicant, decision, note);
end $$;

create or replace function public.console_resolve(report_id uuid, action text, note text default null)
returns void language plpgsql security definer set search_path to ''
as $$
begin
  perform public.console_as_moderator();
  perform public.mod_resolve(report_id, action, note);
end $$;

create or replace function public.console_queue(include_closed boolean default false)
returns jsonb language plpgsql security definer set search_path to ''
as $$
begin
  perform public.console_as_moderator();
  return public.mod_queue(include_closed);
end $$;

revoke all on function public.console_as_moderator() from public, anon, authenticated;
revoke all on function public.console_decide(uuid, text, text) from public, anon, authenticated;
revoke all on function public.console_resolve(uuid, text, text) from public, anon, authenticated;
revoke all on function public.console_queue(boolean) from public, anon, authenticated;
grant execute on function public.console_decide(uuid, text, text) to service_role;
grant execute on function public.console_resolve(uuid, text, text) to service_role;
grant execute on function public.console_queue(boolean) to service_role;
