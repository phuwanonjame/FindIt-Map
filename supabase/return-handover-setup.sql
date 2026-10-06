-- Run after all-in-one-setup.sql and chat-security-setup.sql.
-- The recipient, not the post author alone, must confirm a completed return.
begin;

create table if not exists public.return_handovers (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.app_records(id) on delete cascade,
  conversation_id uuid not null unique references public.app_records(id) on delete cascade,
  holder_id uuid not null references auth.users(id) on delete cascade,
  recipient_id uuid not null references auth.users(id) on delete cascade,
  state text not null check (state in ('WAITING_RECEIPT', 'DISPUTED', 'CONFIRMED')),
  attempt_count integer not null default 1,
  initiated_at timestamptz not null default now(),
  confirmed_at timestamptz,
  disputed_at timestamptz,
  initial_email_sent_at timestamptz,
  reminder_24h_sent_at timestamptz,
  reminder_72h_sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint return_handover_distinct_users check (holder_id <> recipient_id)
);

create index if not exists return_handovers_post_id_idx on public.return_handovers (post_id);
create index if not exists return_handovers_pending_idx on public.return_handovers (initiated_at)
  where state = 'WAITING_RECEIPT';

alter table public.return_handovers enable row level security;
revoke all on public.return_handovers from public, anon, authenticated;
grant select on public.return_handovers to authenticated;

drop policy if exists "return participants can read" on public.return_handovers;
create policy "return participants can read" on public.return_handovers
for select to authenticated
using (auth.uid() = holder_id or auth.uid() = recipient_id);

-- Direct Post.update({ status: 'RETURNED' }) must not bypass the recipient.
create or replace function public.guard_post_return_status()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.entity <> 'Post' then return new; end if;

  if tg_op = 'INSERT' then
    if new.data->>'status' = 'RETURNED' then
      raise exception 'A return requires recipient confirmation';
    end if;
    return new;
  end if;

  if old.data->>'status' = 'RETURNED' and new.data->>'status' is distinct from 'RETURNED' then
    raise exception 'A confirmed return cannot be reopened directly';
  end if;

  if old.data->>'status' is distinct from 'RETURNED' and new.data->>'status' = 'RETURNED'
     and not exists (
       select 1 from public.return_handovers handover
       where handover.post_id = new.id and handover.state = 'CONFIRMED'
     ) then
    raise exception 'A return requires recipient confirmation';
  end if;
  return new;
end;
$$;

drop trigger if exists guard_post_return_status on public.app_records;
create trigger guard_post_return_status
before insert or update on public.app_records
for each row execute function public.guard_post_return_status();

create or replace function public.start_return_handover(p_conversation_id uuid)
returns public.return_handovers
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_conversation public.app_records%rowtype;
  v_post public.app_records%rowtype;
  v_other uuid;
  v_holder uuid;
  v_recipient uuid;
  v_handover public.return_handovers%rowtype;
begin
  if v_actor is null then raise exception 'Sign in to start a return'; end if;

  select * into v_conversation from public.app_records
  where id = p_conversation_id and entity = 'Conversation' for update;
  if not found then raise exception 'Conversation not found'; end if;
  if jsonb_typeof(v_conversation.data->'participant_ids') <> 'array'
     or jsonb_array_length(v_conversation.data->'participant_ids') <> 2
     or not (v_conversation.data->'participant_ids' ? v_actor::text) then
    raise exception 'Only conversation participants can start a return';
  end if;

  select * into v_post from public.app_records
  where id = (v_conversation.data->>'post_id')::uuid and entity = 'Post' for update;
  if not found or v_post.owner_id is null then raise exception 'Post not found'; end if;
  if v_post.data->>'status' in ('RETURNED', 'CLOSED') then
    raise exception 'This post is already closed';
  end if;
  if not (v_conversation.data->'participant_ids' ? v_post.owner_id::text) then
    raise exception 'Post author is not in this conversation';
  end if;

  select value::uuid into v_other
  from jsonb_array_elements_text(v_conversation.data->'participant_ids') as participant(value)
  where value <> v_post.owner_id::text limit 1;
  if v_other is null then raise exception 'Return recipient is missing'; end if;

  if v_post.data->>'post_type' = 'FOUND' then
    v_holder := v_post.owner_id;
    v_recipient := v_other;
  elsif v_post.data->>'post_type' = 'LOST' then
    v_holder := v_other;
    v_recipient := v_post.owner_id;
  else
    raise exception 'Invalid post type';
  end if;
  if v_actor <> v_holder then raise exception 'Only the person holding the item can mark it handed over'; end if;

  if exists (
    select 1 from public.return_handovers
    where post_id = v_post.id and conversation_id <> p_conversation_id
      and state = 'WAITING_RECEIPT'
  ) then
    raise exception 'Another return for this post is awaiting confirmation';
  end if;

  select * into v_handover from public.return_handovers
  where conversation_id = p_conversation_id for update;
  if found then
    if v_handover.state = 'CONFIRMED' then raise exception 'Return already confirmed'; end if;
    if v_handover.state = 'WAITING_RECEIPT' then return v_handover; end if;
    update public.return_handovers set
      state = 'WAITING_RECEIPT', attempt_count = attempt_count + 1,
      initiated_at = now(), confirmed_at = null, disputed_at = null,
      initial_email_sent_at = null, reminder_24h_sent_at = null,
      reminder_72h_sent_at = null, updated_at = now()
    where id = v_handover.id returning * into v_handover;
  else
    insert into public.return_handovers (post_id, conversation_id, holder_id, recipient_id, state)
    values (v_post.id, p_conversation_id, v_holder, v_recipient, 'WAITING_RECEIPT')
    returning * into v_handover;
  end if;

  update public.app_records
  set data = jsonb_set(data, '{status}', '"ARRANGING_RETURN"'::jsonb)
  where id = v_post.id and data->>'status' <> 'ARRANGING_RETURN';

  insert into public.app_records (entity, owner_id, data) values
    ('PostEvent', v_actor, jsonb_build_object(
      'post_id', v_post.id, 'event_type', 'RETURN_HANDOVER_STARTED',
      'user_id', v_actor, 'description', 'ผู้ถือของแจ้งว่าส่งมอบแล้ว รอผู้รับยืนยัน'
    )),
    ('Notification', v_actor, jsonb_build_object(
      'user_id', v_recipient, 'type', 'RETURN_HANDOVER',
      'title', 'กรุณายืนยันว่าได้รับของแล้ว',
      'body', coalesce(v_post.data->>'title', 'ประกาศของคุณ'),
      'reference_id', v_post.id, 'conversation_id', p_conversation_id,
      'handover_id', v_handover.id
    ));
  return v_handover;
end;
$$;

create or replace function public.respond_return_handover(p_conversation_id uuid, p_received boolean)
returns public.return_handovers
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_handover public.return_handovers%rowtype;
  v_post public.app_records%rowtype;
begin
  if v_actor is null then raise exception 'Sign in to confirm a return'; end if;
  select * into v_handover from public.return_handovers
  where conversation_id = p_conversation_id;
  if not found then raise exception 'Return request not found'; end if;
  if v_actor <> v_handover.recipient_id then raise exception 'Only the recipient can confirm receipt'; end if;

  select * into v_post from public.app_records
  where id = v_handover.post_id and entity = 'Post' for update;
  if not found or v_post.data->>'status' in ('RETURNED', 'CLOSED') then
    raise exception 'Post is already closed';
  end if;
  select * into v_handover from public.return_handovers
  where conversation_id = p_conversation_id for update;
  if v_handover.state <> 'WAITING_RECEIPT' then raise exception 'This return is no longer awaiting confirmation'; end if;

  if p_received then
    update public.return_handovers set state = 'CONFIRMED', confirmed_at = now(), updated_at = now()
    where id = v_handover.id returning * into v_handover;
    update public.app_records set data = data || jsonb_build_object(
      'status', 'RETURNED', 'returned_at', now(), 'closed_at', now()
    ) where id = v_post.id;
    insert into public.app_records (entity, owner_id, data) values
      ('PostEvent', v_actor, jsonb_build_object(
        'post_id', v_post.id, 'event_type', 'RETURNED',
        'user_id', v_actor, 'description', 'ผู้รับยืนยันว่าได้รับของแล้ว'
      )),
      ('Notification', v_actor, jsonb_build_object(
        'user_id', v_handover.holder_id, 'type', 'RETURN_HANDOVER',
        'title', 'ผู้รับยืนยันว่าได้รับของแล้ว',
        'body', coalesce(v_post.data->>'title', 'ประกาศของคุณ'),
        'reference_id', v_post.id, 'conversation_id', p_conversation_id,
        'handover_id', v_handover.id
      ));
  else
    update public.return_handovers set state = 'DISPUTED', disputed_at = now(), updated_at = now()
    where id = v_handover.id returning * into v_handover;
    insert into public.app_records (entity, owner_id, data) values
      ('PostEvent', v_actor, jsonb_build_object(
        'post_id', v_post.id, 'event_type', 'RETURN_DISPUTED',
        'user_id', v_actor, 'description', 'ผู้รับแจ้งว่ายังไม่ได้รับของ'
      )),
      ('Notification', v_actor, jsonb_build_object(
        'user_id', v_handover.holder_id, 'type', 'RETURN_HANDOVER',
        'title', 'ผู้รับแจ้งว่ายังไม่ได้รับของ',
        'body', 'กรุณากลับไปพูดคุยเรื่องการส่งคืนในแชท',
        'reference_id', v_post.id, 'conversation_id', p_conversation_id,
        'handover_id', v_handover.id
      ));
  end if;
  return v_handover;
end;
$$;

revoke all on function public.start_return_handover(uuid) from public, anon;
revoke all on function public.respond_return_handover(uuid, boolean) from public, anon;
grant execute on function public.start_return_handover(uuid) to authenticated;
grant execute on function public.respond_return_handover(uuid, boolean) to authenticated;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'return_handovers'
     ) then
    alter publication supabase_realtime add table public.return_handovers;
  end if;
end;
$$;

commit;
