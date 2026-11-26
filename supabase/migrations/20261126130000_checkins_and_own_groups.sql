-- Check-ins after a meet (they power the Trusted / Glowing / On fire frames) and member-made Lounge groups.

-- ── Check-ins: one per person per match, about the other person. Private: nobody reads someone else's check-ins;
-- members only see their own totals through my_badge_stats().
create table if not exists public.checkins (
  match_id uuid not null references public.matches(id) on delete cascade,
  from_user uuid not null references public.profiles(id) on delete cascade,
  to_user uuid not null references public.profiles(id) on delete cascade,
  showed_up boolean not null,
  positive boolean not null,
  great_communicator boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (match_id, from_user),
  check (from_user <> to_user)
);
alter table public.checkins enable row level security;
drop policy if exists "check in about my match" on public.checkins;
create policy "check in about my match" on public.checkins for insert to authenticated
  with check (
    from_user = (select auth.uid())
    and exists (
      select 1 from public.matches m
      where m.id = match_id
        and ((m.user_a = from_user and m.user_b = to_user) or (m.user_b = from_user and m.user_a = to_user))
    )
  );
drop policy if exists "change my check-in" on public.checkins;
create policy "change my check-in" on public.checkins for update to authenticated
  using (from_user = (select auth.uid())) with check (from_user = (select auth.uid()));
drop policy if exists "see my own check-ins" on public.checkins;
create policy "see my own check-ins" on public.checkins for select to authenticated
  using (from_user = (select auth.uid()));

-- My totals (about me), for the badges page. Reports count unless a moderator closed them as no violation.
create or replace function public.my_badge_stats()
returns json
language sql stable security definer set search_path to ''
as $$
  with me as (select (select auth.uid()) as id),
  about as (select c.* from public.checkins c, me where c.to_user = me.id),
  last5 as (select showed_up from about order by created_at desc limit 5)
  select json_build_object(
    'checkins', (select count(*) from about),
    'positive', (select count(*) from about where positive),
    'shows', (select count(*) from about where showed_up),
    'last5', (select count(*) from last5),
    'last5_all', coalesce((select bool_and(showed_up) from last5), false),
    'communicator', (select count(*) from about where great_communicator),
    'reports90', (select count(*) from public.reports r, me
                  where r.target = me.id and r.created_at > now() - interval '90 days'
                    and coalesce(r.resolution, '') not ilike '%no violation%')
  );
$$;
revoke all on function public.my_badge_stats() from public, anon;
grant execute on function public.my_badge_stats() to authenticated;

-- ── Member-made groups: any member can start one (3 at most), and is its first member.
-- (The count lives in a function: a policy on groups that reads groups would recurse.)
create or replace function app.groups_started_by(u uuid)
returns int language sql stable security definer set search_path to ''
as $ select count(*)::int from public.groups where created_by = u $;

alter table public.groups add column if not exists created_by uuid references public.profiles(id) on delete set null;
drop policy if exists "members start groups" on public.groups;
create policy "members start groups" on public.groups for insert to authenticated
  with check (
    created_by = (select auth.uid())
    and (select app.is_member((select auth.uid())))
    and char_length(name) between 3 and 40
    and char_length(about) between 5 and 140
    and app.groups_started_by((select auth.uid())) < 3
  );
drop policy if exists "creators remove their group" on public.groups;
create policy "creators remove their group" on public.groups for delete to authenticated
  using (created_by = (select auth.uid()));

create or replace function app.join_own_group()
returns trigger language plpgsql security definer set search_path to ''
as $$
begin
  if new.created_by is not null then
    insert into public.group_members (group_id, user_id) values (new.id, new.created_by) on conflict do nothing;
  end if;
  return new;
end $$;
drop trigger if exists groups_join_creator on public.groups;
create trigger groups_join_creator after insert on public.groups for each row execute function app.join_own_group();
