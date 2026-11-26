-- Lounge › Groups: open groups members can join; group posts live only in their group.
create table if not exists public.groups (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  about text not null,
  cover text,                -- key of a cover image bundled in the app (src/art.js), or null for a gradient
  sort int not null default 0,
  created_at timestamptz not null default now()
);
alter table public.groups enable row level security;
drop policy if exists "members see groups" on public.groups;
create policy "members see groups" on public.groups for select to authenticated
  using ((select app.is_member((select auth.uid()))));

create table if not exists public.group_members (
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);
alter table public.group_members enable row level security;
drop policy if exists "see my memberships" on public.group_members;
create policy "see my memberships" on public.group_members for select to authenticated
  using (user_id = (select auth.uid()));
drop policy if exists "join groups" on public.group_members;
create policy "join groups" on public.group_members for insert to authenticated
  with check (user_id = (select auth.uid()) and (select app.is_member((select auth.uid()))));
drop policy if exists "leave groups" on public.group_members;
create policy "leave groups" on public.group_members for delete to authenticated
  using (user_id = (select auth.uid()));

-- Groups with their member count and whether I joined (counts without exposing who the members are).
create or replace function public.group_list()
returns table (id uuid, slug text, name text, about text, cover text, sort int, members int, joined boolean)
language sql stable security definer set search_path to ''
as $$
  select g.id, g.slug, g.name, g.about, g.cover, g.sort,
    (select count(*) from public.group_members m where m.group_id = g.id)::int,
    exists (select 1 from public.group_members m where m.group_id = g.id and m.user_id = (select auth.uid()))
  from public.groups g
  where (select app.is_member((select auth.uid())))
  order by g.sort, g.name;
$$;
revoke all on function public.group_list() from public, anon;
grant execute on function public.group_list() to authenticated;

-- Posts can belong to a group. Posting into a group needs membership.
alter table public.posts add column if not exists group_id uuid references public.groups(id) on delete cascade;
create index if not exists posts_group_idx on public.posts (group_id, created_at desc);
drop policy if exists "write own posts" on public.posts;
create policy "write own posts" on public.posts for insert to authenticated
  with check (
    author = (select auth.uid())
    and (select app.is_member((select auth.uid())))
    and (group_id is null or exists (select 1 from public.group_members m where m.group_id = posts.group_id and m.user_id = (select auth.uid())))
  );

create or replace view public.posts_feed with (security_invoker = true) as
 SELECT id,
        CASE
            WHEN app.post_mine(id) THEN ( SELECT auth.uid() AS uid)
            ELSE NULL::uuid
        END AS author,
    author_alias,
    author_verified,
    author_role,
    topic,
    title,
    body,
    photos,
    spicy,
    created_at,
    poll_options,
    app.post_like_count(id) AS like_count,
    (( SELECT count(*) AS count
           FROM comments c
          WHERE c.post_id = p.id))::integer AS comment_count,
    (EXISTS ( SELECT 1
           FROM post_likes l
          WHERE l.post_id = p.id AND l.user_id = (( SELECT auth.uid() AS uid)))) AS liked,
    app.post_mine(id) AS mine,
    ( SELECT json_build_object('alias', c.author_alias, 'role', c.author_role, 'body', c.body) AS json_build_object
           FROM comments c
          WHERE c.post_id = p.id AND c.author_role = 'educator'::text
          ORDER BY c.created_at
         LIMIT 1) AS expert_reply,
    app.poll_counts(id, COALESCE(array_length(poll_options, 1), 0)) AS poll_counts,
    ( SELECT v.option
           FROM poll_votes v
          WHERE v.post_id = p.id AND v.user_id = (( SELECT auth.uid() AS uid))) AS my_vote,
    group_id
   FROM posts p;

insert into public.groups (slug, name, about, cover, sort) values
  ('amsterdam-nights', 'Amsterdam Nights', 'Bars, plans and going out in the city.', 'g4', 1),
  ('first-times', 'First Times', 'New to this, or back after a long time. No question is silly.', 'g1', 2),
  ('couples-corner', 'Couples Corner', 'For couples who date together, and the people who like meeting them.', 'g3', 3),
  ('kink-101', 'Kink 101', 'Curious and new. Ask anything, kindly.', 'boundaries', 4),
  ('over-35', 'Over 35', 'Grown-up dating, no games.', null, 5),
  ('queer-curious', 'Queer & Curious', 'A warm corner for LGBTQ+ members and the curious.', null, 6)
on conflict (slug) do nothing;

-- posts uses column-level SELECT grants (author stays hidden); the view reads group_id, so it needs its own grant.
grant select (group_id) on public.posts to authenticated;
