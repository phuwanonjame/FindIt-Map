-- Run once in Supabase Dashboard > SQL Editor after chat-security-setup.sql.
-- Publishes changes from the existing app_records table to Supabase Realtime.
-- Existing row-level security still controls which chat rows each user receives.
do $$
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    execute 'create publication supabase_realtime';
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'app_records'
  ) then
    execute 'alter publication supabase_realtime add table public.app_records';
  end if;
end;
$$;
