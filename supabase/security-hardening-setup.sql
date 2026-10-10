-- Apply after deploying the matching frontend upload path change.
-- Existing public image URLs remain readable; only new uploads are constrained.
begin;

create index if not exists app_records_owner_created_at_idx
on public.app_records (owner_id, created_at desc);

create or replace function public.guard_app_record_writes()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
  recent_count integer;
begin
  -- Internal service-role jobs have no user JWT and are handled separately.
  if actor_id is null then
    return new;
  end if;

  if tg_op = 'UPDATE' then
    if new.owner_id is distinct from old.owner_id
       or new.entity is distinct from old.entity
       or new.created_at is distinct from old.created_at then
      raise exception 'Record identity cannot be changed';
    end if;
    if new.entity = 'Conversation' and
       (new.data->'participant_ids' is distinct from old.data->'participant_ids'
        or new.data->>'post_id' is distinct from old.data->>'post_id') then
      raise exception 'Conversation participants cannot be changed';
    end if;
    if new.entity = 'Message' and
       (new.data->>'sender_id' is distinct from old.data->>'sender_id'
        or new.data->>'conversation_id' is distinct from old.data->>'conversation_id') then
      raise exception 'Message identity cannot be changed';
    end if;
    if new.entity = 'Notification' and
       new.data->>'user_id' is distinct from old.data->>'user_id' then
      raise exception 'Notification recipient cannot be changed';
    end if;
  else
    -- A client must not choose an old timestamp to escape a quota.
    new.created_at := now();
    perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(actor_id::text));
    select count(*) into recent_count
    from public.app_records
    where owner_id = actor_id and created_at > now() - interval '1 minute';
    if recent_count >= 120 then
      raise exception 'Too many requests; please try again later';
    end if;
    if new.entity = 'Post' then
      select count(*) into recent_count
      from public.app_records
      where owner_id = actor_id and entity = 'Post'
        and created_at > now() - interval '1 hour';
      if recent_count >= 10 then
        raise exception 'Too many posts; please try again later';
      end if;
    end if;
  end if;

  if pg_catalog.octet_length(new.data::text) > 262144 then
    raise exception 'Record is too large';
  end if;
  return new;
end;
$$;

drop trigger if exists guard_app_record_writes on public.app_records;
create trigger guard_app_record_writes
before insert or update on public.app_records
for each row execute function public.guard_app_record_writes();

update storage.buckets
set public = true,
    file_size_limit = 10485760,
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']
where id = 'post-images';

drop policy if exists "authenticated users upload images" on storage.objects;
drop policy if exists "users upload own post images" on storage.objects;

create policy "users upload own post images" on storage.objects
for insert to authenticated
with check (
  bucket_id = 'post-images'
  and (storage.foldername(name))[1] = auth.uid()::text
  and array_length(storage.foldername(name), 1) = 1
);

commit;
