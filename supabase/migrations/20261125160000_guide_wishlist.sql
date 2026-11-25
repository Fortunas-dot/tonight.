-- Guide wishlist: private to you. A match only ever sees the items you BOTH added (shared_wishlist).
alter table public.profile_private
  add column if not exists wishlist text[] not null default '{}';

-- The guide ids both people in a match saved. Only callable by someone in that match; never reveals the rest.
create or replace function public.shared_wishlist(m uuid)
returns text[]
language sql
stable
security definer
set search_path to ''
as $$
  select coalesce(array(
    select w
    from public.matches mt
    join public.profile_private pa on pa.user_id = mt.user_a
    join public.profile_private pb on pb.user_id = mt.user_b
    cross join lateral unnest(pa.wishlist) as w
    where mt.id = m
      and (select auth.uid()) in (mt.user_a, mt.user_b)
      and w = any (pb.wishlist)
    order by w
  ), '{}');
$$;

revoke all on function public.shared_wishlist(uuid) from public, anon;
grant execute on function public.shared_wishlist(uuid) to authenticated;
