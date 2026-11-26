-- Fixes from a full check of the app.

-- 1. Text that is only spaces was accepted in chat messages, ideas and posts. (NOT VALID: checks new rows only.)
alter table public.messages drop constraint if exists messages_not_blank;
alter table public.messages add constraint messages_not_blank check (btrim(body) <> '') not valid;
alter table public.ideas drop constraint if exists ideas_not_blank;
alter table public.ideas add constraint ideas_not_blank check (btrim(title) <> '') not valid;
alter table public.posts drop constraint if exists posts_not_blank;
alter table public.posts add constraint posts_not_blank check (btrim(coalesce(title, '') || body) <> '' or cardinality(photos) > 0) not valid;

-- 2. Names and plans had no length limit (a 500-letter name or a 5,000-letter meeting place was accepted).
alter table public.profiles drop constraint if exists profiles_name_length;
alter table public.profiles add constraint profiles_name_length check (name is null or char_length(name) <= 40) not valid;
alter table public.plans drop constraint if exists plans_length;
alter table public.plans add constraint plans_length check (char_length(place) <= 120 and char_length(at_time) <= 40) not valid;

-- The blank message and idea the check left behind.
delete from public.messages where btrim(body) = '';
delete from public.idea_votes where idea_id in (select id from public.ideas where btrim(title) = '');
delete from public.ideas where btrim(title) = '';

-- 3. Support: messages used to go nowhere. Now they are saved, moderators see them (Moderation › Support) and
--    can reply; the member gets a notification and sees the reply in Me › Support.
create table if not exists public.support_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade, -- the member this conversation belongs to
  from_team boolean not null default false,
  body text not null check (char_length(body) between 1 and 2000 and btrim(body) <> ''),
  created_at timestamptz not null default now()
);
create index if not exists support_messages_user on public.support_messages (user_id, created_at);
alter table public.support_messages enable row level security;

drop policy if exists "read my support chat" on public.support_messages;
create policy "read my support chat" on public.support_messages for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_moderator()));
drop policy if exists "write to support" on public.support_messages;
create policy "write to support" on public.support_messages for insert to authenticated
  with check (
    (user_id = (select auth.uid()) and not from_team)
    or (from_team and (select public.is_moderator()))
  );
grant select, insert on public.support_messages to authenticated;

-- Moderators get a push for each member message; the member gets one for each reply.
create or replace function app.notify_support()
returns trigger language plpgsql security definer set search_path to ''
as $$
declare m record;
begin
  if new.from_team then
    perform app.push(new.user_id, 'support', 'Tonight support replied', left(new.body, 120), jsonb_build_object('route', 'support'));
  else
    for m in select user_id from app.moderators loop
      perform app.push(m.user_id, 'moderation', 'New support message', left(new.body, 120), jsonb_build_object('route', 'moderation'));
    end loop;
  end if;
  return new;
end $$;
drop trigger if exists support_push on public.support_messages;
create trigger support_push after insert on public.support_messages for each row execute function app.notify_support();

-- Moderators: one row per conversation, newest first, with whether the member is waiting on an answer.
create or replace function public.mod_support()
returns table (user_id uuid, name text, alias text, last_body text, last_at timestamptz, waiting boolean)
language sql stable security definer set search_path to ''
as $$
  select t.user_id, t.name, t.alias, t.body, t.created_at, t.waiting from (
    select distinct on (s.user_id) s.user_id, p.name, p.alias, s.body, s.created_at, not s.from_team as waiting
    from public.support_messages s
    left join public.profiles p on p.id = s.user_id
    where public.is_moderator()
    order by s.user_id, s.created_at desc
  ) t order by t.created_at desc;
$$;
revoke all on function public.mod_support() from public, anon;
grant execute on function public.mod_support() to authenticated;
