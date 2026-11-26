-- Discover only shows profiles with at least one photo (no empty cards, e.g. the App Review account).
create or replace function public.discover_profiles(max_rows integer default 30)
returns setof public.profiles
language sql stable
set search_path to ''
as $function$
  select p.*
  from public.profiles p, public.profiles me
  where me.id = (select auth.uid())
    and me.review_status = 'approved'
    and p.id <> me.id
    and p.onboarded
    and p.review_status = 'approved'
    and not p.paused
    and coalesce(array_length(p.photos, 1), 0) > 0
    and not app.is_banned(p.id)
    and app.show_label(p.gender) = any (me.show)
    and app.show_label(me.gender) = any (p.show)
    and not exists (select 1 from public.likes l where l.liker = me.id and l.likee = p.id)
    and not exists (select 1 from public.matches m where m.user_a = least(me.id, p.id) and m.user_b = greatest(me.id, p.id))
  order by (p.live_until > now()) desc nulls last, p.updated_at desc
  limit greatest(1, least(max_rows, 100));
$function$;
