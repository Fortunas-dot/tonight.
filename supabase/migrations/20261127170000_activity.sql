-- Activity per member for the testing dashboard (fortunas.nl/tonight/admin). Members can't read any of it.
-- The app already calls app_ping() on start, on coming back and every minute while open; from now on each ping
-- also counts towards that day's minutes in the app and its number of app opens (a ping after 5+ minutes away).

create table if not exists public.activity_days (
  user_id uuid not null references auth.users (id) on delete cascade,
  day date not null,                       -- Amsterdam date
  minutes int not null default 0,          -- minutes with the app open
  opens int not null default 0,            -- times the app was opened or came back after 5+ minutes
  first_at timestamptz not null default now(),
  last_at timestamptz not null default now(),
  primary key (user_id, day)
);
alter table public.activity_days enable row level security;
revoke all on public.activity_days from anon, authenticated;

create or replace function public.app_ping()
returns void language plpgsql security definer set search_path to ''
as $$
declare
  me uuid := (select auth.uid());
  prev timestamptz;
  today date := (now() at time zone 'Europe/Amsterdam')::date;
begin
  if me is null then return; end if;
  select last_active_at into prev from public.presence where user_id = me;
  insert into public.presence (user_id, last_active_at) values (me, now())
    on conflict (user_id) do update set last_active_at = excluded.last_active_at;
  -- Pings closer than 30 seconds (start + foreground at once) don't add a minute; a gap of 5+ minutes is a new open.
  insert into public.activity_days as d (user_id, day, minutes, opens)
    values (me, today, 1, 1)
    on conflict (user_id, day) do update set
      minutes = d.minutes + case when prev is null or now() - prev >= interval '30 seconds' then 1 else 0 end,
      opens = d.opens + case when prev is null or now() - prev >= interval '5 minutes' then 1 else 0 end,
      last_at = now();
end $$;
revoke all on function public.app_ping() from public, anon;
grant execute on function public.app_ping() to authenticated;

-- Everything one member did, for the dashboard's profile view. Service role only. Message texts are left out.
create or replace function public.console_user_activity(member uuid)
returns jsonb language sql stable security definer set search_path to ''
as $$
  with days as (
    select d::date as day from generate_series((now() at time zone 'Europe/Amsterdam')::date - 13, (now() at time zone 'Europe/Amsterdam')::date, interval '1 day') d
  ),
  name_of as (select id, coalesce(name, 'someone') as name, coalesce(is_demo, false) as demo from public.profiles),
  events as (
    select l.created_at as at, 'like' as kind, 'Liked ' || n.name as text, n.demo from public.likes l join name_of n on n.id = l.likee where l.liker = member
    union all select l.created_at, 'liked', 'Was liked by ' || n.name, n.demo from public.likes l join name_of n on n.id = l.liker where l.likee = member
    union all select m.created_at, 'match', 'Matched with ' || n.name, n.demo from public.matches m
      join name_of n on n.id = case when m.user_a = member then m.user_b else m.user_a end where member in (m.user_a, m.user_b)
    union all select max(x.created_at), 'message', count(*) || ' message' || case when count(*) > 1 then 's' else '' end || ' to ' || n.name, n.demo
      from public.messages x join public.matches m on m.id = x.match_id
      join name_of n on n.id = case when m.user_a = member then m.user_b else m.user_a end
      where x.sender = member group by m.id, n.name, n.demo, (x.created_at at time zone 'Europe/Amsterdam')::date
    union all select p.created_at, 'post', 'Posted in the Lounge: ' || coalesce(nullif(p.title, ''), left(p.body, 60)), false from public.posts p where p.author = member
    union all select c.created_at, 'comment', 'Commented in the Lounge: ' || left(c.body, 60), false from public.comments c where c.author = member
    union all select r.created_at, 'report', 'Reported ' || coalesce(n.name, 'a post') || ': ' || r.reason, false from public.reports r left join name_of n on n.id = r.target where r.reporter = member
    union all select r.created_at, 'reported', 'Was reported: ' || r.reason, false from public.reports r where r.target = member
    union all select k.created_at, 'checkin', 'Checked in after meeting ' || n.name, n.demo from public.checkins k join name_of n on n.id = k.to_user where k.from_user = member
    union all select s.created_at, 'support', 'Wrote to support', false from public.support_messages s where s.user_id = member and not s.from_team
    union all select pl.created_at, 'plan', 'Made a plan: ' || pl.place, false from public.plans pl where pl.created_by = member
  )
  select jsonb_build_object(
    'days', (select jsonb_agg(jsonb_build_object('day', days.day,
               'minutes', coalesce(a.minutes, 0), 'opens', coalesce(a.opens, 0)) order by days.day)
             from days left join public.activity_days a on a.user_id = member and a.day = days.day),
    'totals', jsonb_build_object(
      'minutes', (select coalesce(sum(minutes), 0) from public.activity_days where user_id = member),
      'opens', (select coalesce(sum(opens), 0) from public.activity_days where user_id = member),
      'daysActive', (select count(*) from public.activity_days where user_id = member),
      'trackedSince', (select min(day) from public.activity_days where user_id = member),
      'likesSent', (select count(*) from public.likes where liker = member),
      'likesReceived', (select count(*) from public.likes where likee = member),
      'matches', (select count(*) from public.matches where member in (user_a, user_b)),
      'messagesSent', (select count(*) from public.messages where sender = member),
      'messagesReceived', (select count(*) from public.messages x join public.matches m on m.id = x.match_id
                           where member in (m.user_a, m.user_b) and x.sender <> member),
      'posts', (select count(*) from public.posts where author = member),
      'comments', (select count(*) from public.comments where author = member),
      'reportsMade', (select count(*) from public.reports where reporter = member),
      'reportsAgainst', (select count(*) from public.reports where target = member)
    ),
    'events', (select coalesce(jsonb_agg(e order by e.at desc), '[]'::jsonb) from (select * from events order by at desc limit 60) e)
  );
$$;

-- Minutes in the app over the last 7 days, per member, for the Users table.
create or replace function public.console_week_minutes()
returns table (user_id uuid, minutes bigint, opens bigint) language sql stable security definer set search_path to ''
as $$
  select user_id, sum(minutes), sum(opens) from public.activity_days
  where day > (now() at time zone 'Europe/Amsterdam')::date - 7 group by user_id;
$$;

revoke all on function public.console_user_activity(uuid) from public, anon, authenticated;
revoke all on function public.console_week_minutes() from public, anon, authenticated;
grant execute on function public.console_user_activity(uuid) to service_role;
grant execute on function public.console_week_minutes() to service_role;
