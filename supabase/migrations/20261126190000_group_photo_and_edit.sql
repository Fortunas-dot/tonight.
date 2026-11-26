-- Member-made groups get their own photo, and whoever started a group can edit it afterwards.

-- The photo is a path in the post-photos bucket (uploaded into the creator's own folder, visible to members).
alter table public.groups add column if not exists photo text;

-- Starting a group may include a photo, but only one from your own folder.
drop policy if exists "members start groups" on public.groups;
create policy "members start groups" on public.groups for insert to authenticated
  with check (
    created_by = (select auth.uid())
    and (select app.is_member((select auth.uid())))
    and char_length(name) between 3 and 40
    and char_length(about) between 5 and 140
    and app.groups_started_by((select auth.uid())) < 3
    and (photo is null or photo like (select auth.uid())::text || '/%')
  );

-- Creators edit name, about and photo of their own group (same length rules as when starting it). Nothing else.
revoke update on public.groups from authenticated;
grant update (name, about, photo) on public.groups to authenticated;
drop policy if exists "creators edit their group" on public.groups;
create policy "creators edit their group" on public.groups for update to authenticated
  using (created_by = (select auth.uid()))
  with check (
    created_by = (select auth.uid())
    and char_length(name) between 3 and 40
    and char_length(about) between 5 and 140
    and (photo is null or photo like (select auth.uid())::text || '/%')
  );

-- The list now also says which photo to show and whether the group is mine (so I see Edit).
drop function if exists public.group_list();
create function public.group_list()
returns table (id uuid, slug text, name text, about text, cover text, photo text, sort int, members int, joined boolean, mine boolean)
language sql stable security definer set search_path to ''
as $$
  select g.id, g.slug, g.name, g.about, g.cover, g.photo, g.sort,
    (select count(*) from public.group_members m where m.group_id = g.id)::int,
    exists (select 1 from public.group_members m where m.group_id = g.id and m.user_id = (select auth.uid())),
    g.created_by is not null and g.created_by = (select auth.uid())
  from public.groups g
  where (select app.is_member((select auth.uid())))
  order by g.sort, g.name;
$$;
revoke all on function public.group_list() from public, anon;
grant execute on function public.group_list() to authenticated;
