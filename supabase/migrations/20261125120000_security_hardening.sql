-- Security hardening (2026-11-25).
-- 1. Only approved, unbanned members (and moderators) can see members, photos and the Lounge.
--    Before this, any anonymous sign-in (anyone with the app's public key) could read every profile and photo.
-- 2. Lounge stays pseudonymous: the real account id behind a post, comment, idea, like or vote is no longer readable.
-- 3. Writes (likes, messages, plans, posts, comments, ideas, votes) need a member; banned accounts can't act.
-- 4. Photo paths must point at the owner's own folder; adding a new photo clears "verified" until re-verified.
-- 5. Reports can't be filed as already-closed; post reports get the author filled in server-side.
-- 6. The signed-out role (anon) gets no access to app tables or functions.

/* ---------- Helpers ---------- */

create or replace function app.is_member(u uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select u is not null
     and not exists (select 1 from app.bans b where b.user_id = u)
     and (exists (select 1 from app.moderators m where m.user_id = u)
          or exists (select 1 from public.profiles p where p.id = u and p.onboarded and p.review_status = 'approved'));
$$;

create or replace function app.is_match_partner(other uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.matches m
    where m.user_a = least(other, (select auth.uid())) and m.user_b = greatest(other, (select auth.uid())));
$$;

-- In this match, and neither side has blocked the other.
create or replace function app.can_message(m uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.matches x
    where x.id = m and (select auth.uid()) in (x.user_a, x.user_b)
      and not app.is_blocked(x.user_a, x.user_b));
$$;

create or replace function app.paths_in_folder(paths text[], folder uuid)
returns boolean language sql immutable set search_path = '' as $$
  select coalesce(bool_and(p like folder::text || '/%' and p not like '%..%'), true) from unnest(paths) p;
$$;

-- Lounge: "is this mine" and counts, without exposing who did what.
create or replace function app.post_mine(post uuid) returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.posts where id = post and author = (select auth.uid()));
$$;
create or replace function app.comment_mine(c uuid) returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.comments where id = c and author = (select auth.uid()));
$$;
create or replace function app.idea_mine(i uuid) returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.ideas where id = i and author = (select auth.uid()));
$$;
create or replace function app.post_like_count(post uuid) returns integer language sql stable security definer set search_path = '' as $$
  select count(*)::integer from public.post_likes where post_id = post;
$$;
create or replace function app.comment_like_count(c uuid) returns integer language sql stable security definer set search_path = '' as $$
  select count(*)::integer from public.comment_likes where comment_id = c;
$$;
create or replace function app.poll_counts(post uuid, n integer) returns integer[] language sql stable security definer set search_path = '' as $$
  select array_agg(coalesce((select count(*) from public.poll_votes v where v.post_id = post and v.option = o.i), 0)::integer order by o.i)
  from generate_series(0, coalesce(n, 0) - 1) o(i);
$$;
create or replace function app.idea_score(i uuid) returns integer language sql stable security definer set search_path = '' as $$
  select coalesce(sum(value), 0)::integer from public.idea_votes where idea_id = i;
$$;

revoke all on function app.is_member(uuid), app.is_match_partner(uuid), app.can_message(uuid), app.paths_in_folder(text[], uuid),
  app.post_mine(uuid), app.comment_mine(uuid), app.idea_mine(uuid), app.post_like_count(uuid), app.comment_like_count(uuid),
  app.poll_counts(uuid, integer), app.idea_score(uuid) from public, anon;
grant execute on function app.is_member(uuid), app.is_match_partner(uuid), app.can_message(uuid), app.paths_in_folder(text[], uuid),
  app.post_mine(uuid), app.comment_mine(uuid), app.idea_mine(uuid), app.post_like_count(uuid), app.comment_like_count(uuid),
  app.poll_counts(uuid, integer), app.idea_score(uuid) to authenticated, service_role;

/* ---------- Profiles ---------- */

drop policy if exists "read own or member unblocked profiles" on public.profiles;
create policy "read own, matches, or members" on public.profiles for select to authenticated using (
  id = (select auth.uid())
  or (not app.is_blocked((select auth.uid()), id)
      and (app.is_match_partner(id)
           or ((select app.is_member((select auth.uid())))
               and onboarded and review_status = 'approved' and not paused and not app.is_banned(id))))
);

alter table public.profiles add constraint profiles_photos_own check (app.paths_in_folder(photos, id));

-- Verified means "these photos are you": a newly added photo clears it until the member verifies again.
create or replace function app.protect_verified()
returns trigger language plpgsql set search_path = '' as $$
begin
  if coalesce(current_setting('request.jwt.claim.role', true), (current_setting('request.jwt.claims', true)::jsonb ->> 'role'), '') <> 'service_role'
     and current_user <> 'postgres' then
    if tg_op = 'INSERT' then
      new.verified := false; new.verified_at := null; new.verification_method := null;
    elsif exists (select 1 from unnest(coalesce(new.photos, '{}')) p where p <> all (coalesce(old.photos, '{}'))) then
      new.verified := false; new.verified_at := null; new.verification_method := null;
    else
      new.verified := old.verified; new.verified_at := old.verified_at; new.verification_method := old.verification_method;
    end if;
  end if;
  return new;
end $$;

/* ---------- Likes, matches, messages, plans ---------- */

drop policy if exists "like as myself" on public.likes;
create policy "like as myself" on public.likes for insert to authenticated with check (
  liker = (select auth.uid()) and (select app.is_member((select auth.uid()))) and app.is_member(likee) and not app.is_blocked(liker, likee)
);

drop policy if exists "send in my matches" on public.messages;
create policy "send in my matches" on public.messages for insert to authenticated with check (
  sender = (select auth.uid()) and (select app.is_member((select auth.uid()))) and app.can_message(match_id)
);

drop policy if exists "make plans in my matches" on public.plans;
create policy "make plans in my matches" on public.plans for insert to authenticated with check (
  created_by = (select auth.uid()) and (select app.is_member((select auth.uid()))) and app.can_message(match_id)
);
drop policy if exists "change plans in my matches" on public.plans;
create policy "change plans in my matches" on public.plans for update to authenticated
  using (app.is_match_member(match_id))
  with check ((select app.is_member((select auth.uid()))) and app.can_message(match_id));

/* ---------- Lounge: posts, comments, ideas, likes, votes ---------- */

drop policy if exists "read posts" on public.posts;
create policy "read posts" on public.posts for select to authenticated using (
  author = (select auth.uid())
  or ((select app.is_member((select auth.uid()))) and (author is null or not app.is_blocked((select auth.uid()), author)))
);
drop policy if exists "write own posts" on public.posts;
create policy "write own posts" on public.posts for insert to authenticated with check (
  author = (select auth.uid()) and (select app.is_member((select auth.uid())))
);
alter table public.posts add constraint posts_photos_own check (author is null or app.paths_in_folder(photos, author));

drop policy if exists "read comments" on public.comments;
create policy "read comments" on public.comments for select to authenticated using (
  author = (select auth.uid())
  or ((select app.is_member((select auth.uid()))) and (author is null or not app.is_blocked((select auth.uid()), author)))
);
drop policy if exists "comment as myself" on public.comments;
create policy "comment as myself" on public.comments for insert to authenticated with check (
  author = (select auth.uid()) and (select app.is_member((select auth.uid())))
);

drop policy if exists "read ideas" on public.ideas;
create policy "read ideas" on public.ideas for select to authenticated using (
  author = (select auth.uid()) or (select app.is_member((select auth.uid())))
);
drop policy if exists "post ideas as myself" on public.ideas;
create policy "post ideas as myself" on public.ideas for insert to authenticated with check (
  author = (select auth.uid()) and status = 'Open' and reply is null and (select app.is_member((select auth.uid())))
);

-- Likes and votes: you see only your own rows; totals come from the feed views.
drop policy if exists "read post likes" on public.post_likes;
create policy "read my post likes" on public.post_likes for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists "like posts as myself" on public.post_likes;
create policy "like posts as myself" on public.post_likes for insert to authenticated with check (user_id = (select auth.uid()) and (select app.is_member((select auth.uid()))));

drop policy if exists "read comment likes" on public.comment_likes;
create policy "read my comment likes" on public.comment_likes for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists "like comments as myself" on public.comment_likes;
create policy "like comments as myself" on public.comment_likes for insert to authenticated with check (user_id = (select auth.uid()) and (select app.is_member((select auth.uid()))));

drop policy if exists "read poll votes" on public.poll_votes;
create policy "read my poll votes" on public.poll_votes for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists "vote as myself" on public.poll_votes;
create policy "vote as myself" on public.poll_votes for insert to authenticated with check (user_id = (select auth.uid()) and (select app.is_member((select auth.uid()))));

drop policy if exists "read votes" on public.idea_votes;
create policy "read my votes" on public.idea_votes for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists "vote as myself" on public.idea_votes;
create policy "vote as myself" on public.idea_votes for insert to authenticated with check (user_id = (select auth.uid()) and (select app.is_member((select auth.uid()))));

-- The account id behind Lounge content is not readable (the alias is what people see).
revoke select on public.posts, public.comments, public.ideas from authenticated;
grant select (id, author_alias, author_verified, author_role, topic, title, body, photos, spicy, created_at, poll_options) on public.posts to authenticated;
grant select (id, post_id, parent_id, author_alias, author_verified, author_role, body, created_at) on public.comments to authenticated;
grant select (id, title, description, cat, status, reply, created_at) on public.ideas to authenticated;

create or replace view public.posts_feed with (security_invoker = true) as
select p.id,
  case when app.post_mine(p.id) then (select auth.uid()) end as author,
  p.author_alias, p.author_verified, p.author_role, p.topic, p.title, p.body, p.photos, p.spicy, p.created_at, p.poll_options,
  app.post_like_count(p.id) as like_count,
  (select count(*) from public.comments c where c.post_id = p.id)::integer as comment_count,
  exists (select 1 from public.post_likes l where l.post_id = p.id and l.user_id = (select auth.uid())) as liked,
  app.post_mine(p.id) as mine,
  (select json_build_object('alias', c.author_alias, 'role', c.author_role, 'body', c.body)
     from public.comments c where c.post_id = p.id and c.author_role = 'educator' order by c.created_at limit 1) as expert_reply,
  app.poll_counts(p.id, coalesce(array_length(p.poll_options, 1), 0)) as poll_counts,
  (select v.option from public.poll_votes v where v.post_id = p.id and v.user_id = (select auth.uid())) as my_vote
from public.posts p;

create or replace view public.comments_feed with (security_invoker = true) as
select c.id, c.post_id, c.parent_id,
  case when app.comment_mine(c.id) then (select auth.uid()) end as author,
  c.author_alias, c.author_verified, c.author_role, c.body, c.created_at,
  app.comment_like_count(c.id) as like_count,
  exists (select 1 from public.comment_likes l where l.comment_id = c.id and l.user_id = (select auth.uid())) as liked,
  app.comment_mine(c.id) as mine
from public.comments c;

create or replace view public.ideas_scored with (security_invoker = true) as
select i.id,
  case when app.idea_mine(i.id) then (select auth.uid()) end as author,
  i.title, i.description, i.cat, i.status, i.reply, i.created_at,
  app.idea_score(i.id) as score
from public.ideas i;

-- Reads other people's comments on my posts, so it runs with owner rights, scoped to me.
create or replace function public.my_lounge_activity()
returns table(post_id uuid, post_title text, alias text, body text, is_reply boolean, created_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select c.post_id,
         coalesce(p.title, left(p.body, 60)),
         c.author_alias,
         c.body,
         (c.parent_id is not null and exists (select 1 from public.comments pc where pc.id = c.parent_id and pc.author = (select auth.uid()))),
         c.created_at
  from public.comments c
  join public.posts p on p.id = c.post_id
  where (select auth.uid()) is not null
    and c.author is distinct from (select auth.uid())
    and (c.author is null or not app.is_blocked((select auth.uid()), c.author))
    and (p.author = (select auth.uid())
         or exists (select 1 from public.comments pc where pc.id = c.parent_id and pc.author = (select auth.uid())))
  order by c.created_at desc
  limit 40;
$$;

/* ---------- Reports ---------- */

drop policy if exists "report as myself" on public.reports;
create policy "report as myself" on public.reports for insert to authenticated with check (
  reporter = (select auth.uid()) and status = 'open' and resolved_at is null and resolved_by is null and resolution is null
);

-- A post report names the post's author for the moderators (members can't read it any more).
create or replace function app.fill_report_target()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.post_id is not null and new.target is null then
    select author into new.target from public.posts where id = new.post_id;
  end if;
  new.reason := left(new.reason, 1000);
  return new;
end $$;
drop trigger if exists reports_fill_target on public.reports;
create trigger reports_fill_target before insert on public.reports for each row execute function app.fill_report_target();

/* ---------- Storage ---------- */

create or replace function app.can_see_photos(owner text)
returns boolean language sql stable security definer set search_path = '' as $$
  select case
    when owner = (select auth.uid())::text then true
    when owner !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then false
    when exists (select 1 from app.moderators m where m.user_id = (select auth.uid())) then true
    when not app.is_member((select auth.uid())) then false
    else exists (
      select 1 from public.profiles p
      where p.id = owner::uuid
        and not app.is_blocked(p.id, (select auth.uid()))
        and (exists (select 1 from public.matches m
                     where m.user_a = least(p.id, (select auth.uid())) and m.user_b = greatest(p.id, (select auth.uid())))
             or (not p.blur_face and p.onboarded and p.review_status = 'approved' and not app.is_banned(p.id))))
  end;
$$;

drop policy if exists "view post photos when signed in" on storage.objects;
create policy "view post photos as a member" on storage.objects for select to authenticated using (
  bucket_id = 'post-photos'
  and ((storage.foldername(name))[1] = (select auth.uid())::text or (select app.is_member((select auth.uid()))))
);

/* ---------- Signed-out role and dangerous privileges ---------- */

revoke all on all tables in schema public from anon;
revoke truncate, references, trigger on all tables in schema public from authenticated;
revoke execute on all functions in schema public from public, anon;
grant execute on all functions in schema public to authenticated, service_role;
alter default privileges in schema public revoke all on tables from anon;
alter default privileges in schema public revoke execute on functions from public, anon;
