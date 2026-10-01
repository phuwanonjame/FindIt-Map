-- Run in Supabase SQL Editor. This schema is intentionally narrow: all app
-- entities live in one versioned document table, while Supabase Auth owns users.
create table if not exists public.app_records (
  id uuid primary key default gen_random_uuid(),
  entity text not null check (entity in ('Post','PostEvent','Claim','Conversation','Message','Notification','SavedPost','Review','Report')),
  owner_id uuid references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists app_records_entity_created_at_idx on public.app_records (entity, created_at desc);

create or replace function public.set_updated_at() returns trigger language plpgsql as $$ begin new.updated_at = now(); return new; end; $$;
drop trigger if exists app_records_updated_at on public.app_records;
create trigger app_records_updated_at before update on public.app_records for each row execute function public.set_updated_at();

alter table public.app_records enable row level security;
create policy "public can read app records" on public.app_records for select using (true);
create policy "users create own records" on public.app_records for insert to authenticated with check (owner_id = auth.uid());
create policy "owners update records" on public.app_records for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "owners delete records" on public.app_records for delete to authenticated using (owner_id = auth.uid());

insert into storage.buckets (id, name, public) values ('post-images', 'post-images', true) on conflict (id) do update set public = true;
create policy "authenticated users upload images" on storage.objects for insert to authenticated with check (bucket_id = 'post-images');
create policy "public can view images" on storage.objects for select using (bucket_id = 'post-images');
