-- Plans made in a chat reach the other person live (RLS still limits it to people in that match).
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'plans') then
    alter publication supabase_realtime add table public.plans;
  end if;
end $$;
