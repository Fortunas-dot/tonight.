-- Numbers for the testing dashboard's Overview tab (fortunas.nl/tonight/admin). Service role only.
-- Real members only (AI demo profiles left out); "today" is the Amsterdam day.
-- Support conversations whose last message is from the member (waiting on the team). Service role only.
create or replace function public.mod_support_waiting()
returns table (user_id uuid) language sql stable security definer set search_path to ''
as $$
  select t.user_id from (
    select distinct on (s.user_id) s.user_id, s.from_team from public.support_messages s order by s.user_id, s.created_at desc
  ) t where not t.from_team;
$$;

create or replace function public.console_stats()
returns jsonb language sql stable security definer set search_path to ''
as $$
  with real as (select id, created_at, onboarded, review_status from public.profiles where not coalesce(is_demo, false)),
       demo as (select id from public.profiles where is_demo),
       today as (select (date_trunc('day', now() at time zone 'Europe/Amsterdam') at time zone 'Europe/Amsterdam') as t),
       days as (
         select d::date as day from generate_series((now() at time zone 'Europe/Amsterdam')::date - 13, (now() at time zone 'Europe/Amsterdam')::date, interval '1 day') d
       )
  select jsonb_build_object(
    'members', (select count(*) from real where onboarded),
    'unfinished', (select count(*) from real where not onboarded),
    'newToday', (select count(*) from real, today where created_at >= today.t),
    'newWeek', (select count(*) from real where created_at >= now() - interval '7 days'),
    'online', (select count(*) from public.console_activity() a join real r on r.id = a.user_id
               where a.pinged_at > now() - interval '2 minutes' or a.active_at > now() - interval '5 minutes'),
    'activeToday', (select count(*) from public.console_activity() a join real r on r.id = a.user_id, today where a.active_at >= today.t),
    'matchesToday', (select count(*) from public.matches, today where created_at >= today.t),
    'matchesWeek', (select count(*) from public.matches where created_at >= now() - interval '7 days'),
    'messagesToday', (select count(*) from public.messages, today where created_at >= today.t),
    'messagesToAI', (select count(*) from public.messages m, today where m.created_at >= today.t
                     and m.sender not in (select id from demo)
                     and exists (select 1 from public.matches x where x.id = m.match_id and (x.user_a in (select id from demo) or x.user_b in (select id from demo)))),
    'likesToday', (select count(*) from public.likes, today where created_at >= today.t and liker not in (select id from demo)),
    'pendingReview', (select count(*) from real where onboarded and review_status = 'pending'),
    'openReports', (select count(*) from public.reports where coalesce(status, 'open') = 'open'),
    'supportWaiting', (select count(*) from public.mod_support_waiting()),
    'signups', (select jsonb_agg(jsonb_build_object('day', days.day, 'n',
                 (select count(*) from real where (created_at at time zone 'Europe/Amsterdam')::date = days.day)) order by days.day) from days)
  );
$$;

revoke all on function public.console_stats() from public, anon, authenticated;
revoke all on function public.mod_support_waiting() from public, anon, authenticated;
grant execute on function public.console_stats() to service_role;
grant execute on function public.mod_support_waiting() to service_role;
