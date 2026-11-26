-- Fixes from a stress test.

-- 1. The 3-groups-per-member limit could be beaten by starting several groups at the same moment (each insert
--    counted before the others were saved). A trigger now takes a per-member lock first, so they count one by one.
create or replace function app.groups_limit()
returns trigger language plpgsql security definer set search_path to ''
as $$
begin
  if new.created_by is not null then
    perform pg_advisory_xact_lock(hashtext('groups_started_by:' || new.created_by::text));
    if (select count(*) from public.groups where created_by = new.created_by) >= 3 then
      raise exception 'groups_started_by: limit of 3 reached' using errcode = 'check_violation';
    end if;
  end if;
  return new;
end $$;
drop trigger if exists groups_limit on public.groups;
create trigger groups_limit before insert on public.groups for each row execute function app.groups_limit();

-- 2. Comments made of only spaces were accepted. (NOT VALID: checks new comments, leaves old rows alone.)
alter table public.comments drop constraint if exists comments_not_blank;
alter table public.comments add constraint comments_not_blank check (btrim(body) <> '') not valid;
