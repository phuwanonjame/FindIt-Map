-- Run once in Supabase Dashboard > SQL Editor before deploying chat attachments.
-- This keeps chat records and attachments visible only to conversation participants.
begin;

create or replace function public.is_chat_participant(chat_id text, participant_id text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.app_records conversation
    where conversation.entity = 'Conversation'
      and conversation.id::text = chat_id
      and conversation.data->'participant_ids' ? participant_id
  );
$$;

revoke all on function public.is_chat_participant(text, text) from public;
grant execute on function public.is_chat_participant(text, text) to authenticated;

create or replace function public.is_post_owner(post_id text, user_id text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.app_records post
    where post.entity = 'Post' and post.id::text = post_id
      and post.owner_id::text = user_id
  );
$$;

revoke all on function public.is_post_owner(text, text) from public;
grant execute on function public.is_post_owner(text, text) to authenticated;

drop policy if exists "public can read app records" on public.app_records;
drop policy if exists "public can read listings" on public.app_records;
drop policy if exists "owners can read own records" on public.app_records;
drop policy if exists "participants can read conversations" on public.app_records;
drop policy if exists "participants can read messages" on public.app_records;
drop policy if exists "recipients can read notifications" on public.app_records;
drop policy if exists "recipients can update notifications" on public.app_records;
drop policy if exists "participants can update conversations" on public.app_records;
drop policy if exists "valid chat inserts" on public.app_records;
drop policy if exists "post owners can read claims" on public.app_records;
drop policy if exists "post owners can update claims" on public.app_records;
drop policy if exists "admins can read reports" on public.app_records;
drop policy if exists "admins can update reports" on public.app_records;

create policy "public can read listings" on public.app_records
for select using (entity in ('Post', 'PostEvent', 'Review'));

create policy "owners can read own records" on public.app_records
for select to authenticated
using (owner_id = auth.uid() and entity in ('Claim', 'SavedPost', 'Report'));

create policy "post owners can read claims" on public.app_records
for select to authenticated
using (entity = 'Claim' and public.is_post_owner(data->>'post_id', auth.uid()::text));

create policy "post owners can update claims" on public.app_records
for update to authenticated
using (entity = 'Claim' and public.is_post_owner(data->>'post_id', auth.uid()::text))
with check (entity = 'Claim' and public.is_post_owner(data->>'post_id', auth.uid()::text));

create policy "admins can read reports" on public.app_records
for select to authenticated
using (entity = 'Report' and auth.jwt()->'app_metadata'->>'role' = 'admin');

create policy "admins can update reports" on public.app_records
for update to authenticated
using (entity = 'Report' and auth.jwt()->'app_metadata'->>'role' = 'admin')
with check (entity = 'Report' and auth.jwt()->'app_metadata'->>'role' = 'admin');

create policy "participants can read conversations" on public.app_records
for select to authenticated
using (entity = 'Conversation' and data->'participant_ids' ? auth.uid()::text);

create policy "participants can read messages" on public.app_records
for select to authenticated
using (entity = 'Message' and public.is_chat_participant(data->>'conversation_id', auth.uid()::text));

create policy "recipients can read notifications" on public.app_records
for select to authenticated
using (entity = 'Notification' and (data->>'user_id' = auth.uid()::text or owner_id = auth.uid()));

create policy "recipients can update notifications" on public.app_records
for update to authenticated
using (entity = 'Notification' and data->>'user_id' = auth.uid()::text)
with check (entity = 'Notification' and data->>'user_id' = auth.uid()::text);

create policy "participants can update conversations" on public.app_records
for update to authenticated
using (entity = 'Conversation' and data->'participant_ids' ? auth.uid()::text)
with check (entity = 'Conversation' and data->'participant_ids' ? auth.uid()::text);

-- Additional check combines with the existing owner-only INSERT policy.
create policy "valid chat inserts" on public.app_records
as restrictive for insert to authenticated
with check (
  (entity <> 'Conversation' or (
    data->'participant_ids'->>0 = auth.uid()::text
    and public.is_post_owner(data->>'post_id', data->'participant_ids'->>1)
  ))
  and (entity <> 'Message' or (
    data->>'sender_id' = auth.uid()::text
    and public.is_chat_participant(data->>'conversation_id', auth.uid()::text)
  ))
  and (entity <> 'Notification' or data->>'type' <> 'MESSAGE' or (
    public.is_chat_participant(data->>'conversation_id', auth.uid()::text)
    and public.is_chat_participant(data->>'conversation_id', data->>'user_id')
  ))
);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('chat-attachments', 'chat-attachments', false, 10485760,
        array['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
on conflict (id) do update set public = false, file_size_limit = 10485760,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "chat participants upload attachments" on storage.objects;
drop policy if exists "chat participants view attachments" on storage.objects;

create policy "chat participants upload attachments" on storage.objects
for insert to authenticated
with check (
  bucket_id = 'chat-attachments'
  and (storage.foldername(name))[2] = auth.uid()::text
  and public.is_chat_participant((storage.foldername(name))[1], auth.uid()::text)
);

create policy "chat participants view attachments" on storage.objects
for select to authenticated
using (
  bucket_id = 'chat-attachments'
  and public.is_chat_participant((storage.foldername(name))[1], auth.uid()::text)
);

commit;
