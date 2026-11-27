-- Error log: what went wrong in the app (failed requests, crashes, screens that broke), so the team can see it on the
-- testing dashboard (fortunas.nl/tonight/admin › Errors) before anyone writes to support.
-- The app can only add rows, through log_app_error (rate limited). Nobody but the service role can read them.
create table if not exists public.app_errors (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users (id) on delete set null,
  kind text not null default 'error' check (kind in ('error', 'warning', 'crash')),
  source text check (char_length(source) <= 80),          -- e.g. backend, render, global, promise
  message text not null check (char_length(message) between 1 and 2000),
  stack text check (char_length(stack) <= 8000),
  context jsonb check (octet_length(context::text) <= 4000),
  screen text check (char_length(screen) <= 80),          -- what the member had open
  app_version text check (char_length(app_version) <= 120),
  platform text check (char_length(platform) <= 40),
  device text check (char_length(device) <= 120),
  created_at timestamptz not null default now()
);
create index if not exists app_errors_created on public.app_errors (created_at desc);
create index if not exists app_errors_user on public.app_errors (user_id, created_at desc);
alter table public.app_errors enable row level security;
revoke all on public.app_errors from anon, authenticated;

create or replace function public.log_app_error(
  p_kind text, p_source text, p_message text, p_stack text default null, p_context jsonb default null,
  p_screen text default null, p_app_version text default null, p_platform text default null, p_device text default null
) returns void language plpgsql security definer set search_path to ''
as $$
declare
  me uuid := auth.uid();
begin
  if coalesce(btrim(p_message), '') = '' then return; end if;
  -- At most 60 an hour per member (120 an hour from phones not signed in yet), so a loop can't fill the table.
  if me is not null then
    if (select count(*) from public.app_errors where user_id = me and created_at > now() - interval '1 hour') >= 60 then return; end if;
  elsif (select count(*) from public.app_errors where user_id is null and created_at > now() - interval '1 hour') >= 120 then
    return;
  end if;
  insert into public.app_errors (user_id, kind, source, message, stack, context, screen, app_version, platform, device)
  values (
    me,
    case when p_kind in ('error', 'warning', 'crash') then p_kind else 'error' end,
    left(p_source, 80), left(btrim(p_message), 2000), left(p_stack, 8000),
    case when p_context is null or octet_length(p_context::text) > 4000 then null else p_context end,
    left(p_screen, 80), left(p_app_version, 120), left(p_platform, 40), left(p_device, 120)
  );
  -- Keep 60 days.
  if random() < 0.02 then delete from public.app_errors where created_at < now() - interval '60 days'; end if;
end $$;

revoke all on function public.log_app_error(text, text, text, text, jsonb, text, text, text, text) from public;
grant execute on function public.log_app_error(text, text, text, text, jsonb, text, text, text, text) to anon, authenticated;
