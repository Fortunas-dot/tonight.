-- Who's online, for the testing dashboard (fortunas.nl/tonight/admin) only.
-- The app pings app_ping() every minute while it is open. Members can never read anyone's presence:
-- the table has no member policies, and console_activity() is for the service role (the dashboard's function).

create table if not exists public.presence (
  user_id uuid primary key references auth.users (id) on delete cascade,
  last_active_at timestamptz not null default now()
);
alter table public.presence enable row level security;
revoke all on public.presence from anon, authenticated;

-- "I'm here": called by the app on start, on coming back to the foreground, and every minute while open.
create or replace function public.app_ping()
returns void language sql security definer set search_path to ''
as $$
  insert into public.presence (user_id, last_active_at)
  select (select auth.uid()), now() where (select auth.uid()) is not null
  on conflict (user_id) do update set last_active_at = excluded.last_active_at;
$$;
revoke all on function public.app_ping() from public, anon;
grant execute on function public.app_ping() to authenticated;

-- Last sign of life per account: the ping, and for app versions without it, sign-in refreshes
-- (about hourly while the app is open), messages, likes and opening/typing in chats.
create or replace function public.console_activity()
returns table (user_id uuid, pinged_at timestamptz, active_at timestamptz)
language sql stable security definer set search_path to ''
as $$
  with signs as (
    select p.user_id, p.last_active_at as at from public.presence p
    union all select s.user_id, coalesce(s.refreshed_at, s.updated_at, s.created_at) from auth.sessions s
    union all select m.sender, max(m.created_at) from public.messages m group by m.sender
    union all select l.liker, max(l.created_at) from public.likes l group by l.liker
    union all select ms.user_id, greatest(ms.read_at, ms.typing_at) from public.match_state ms
  )
  select s.user_id,
         (select p.last_active_at from public.presence p where p.user_id = s.user_id),
         max(s.at)
  from signs s where s.at is not null group by s.user_id;
$$;
revoke all on function public.console_activity() from public, anon, authenticated;
grant execute on function public.console_activity() to service_role;
