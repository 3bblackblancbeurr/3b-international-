begin;

-- One authoritative Jeux 3B save per account. Existing saves start at revision 0
-- and enter the compare-and-swap protocol on their next accepted server write.
alter table public.member_game_saves
  add column if not exists revision bigint not null default 0;

do $$
begin
  if not exists (
    select 1
    from pg_catalog.pg_constraint
    where conrelid = 'public.member_game_saves'::regclass
      and conname = 'member_game_saves_revision_check'
  ) then
    alter table public.member_game_saves
      add constraint member_game_saves_revision_check check (revision >= 0);
  end if;
end
$$;

create table if not exists public.member_game_save_operations (
  user_id uuid not null references public.member_profiles(user_id) on delete cascade,
  operation_id uuid not null,
  base_revision bigint not null check (base_revision >= 0),
  request_hash bytea not null,
  accepted_revision bigint not null check (accepted_revision > 0),
  created_at timestamptz not null default now(),
  primary key (user_id, operation_id)
);

create index if not exists member_game_save_operations_created_idx
  on public.member_game_save_operations(user_id, created_at desc);

alter table public.member_game_save_operations enable row level security;
revoke all on public.member_game_save_operations from public, anon, authenticated;
grant select, insert, delete on public.member_game_save_operations to service_role;

-- Browsers keep owner-scoped reads, but every write now crosses the server CAS
-- boundary below. This prevents two devices from silently overwriting each other.
revoke insert, update, delete on public.member_game_saves from authenticated;
drop policy if exists member_saves_owner_insert on public.member_game_saves;
drop policy if exists member_saves_owner_update on public.member_game_saves;

create or replace function public.member_game_save_sync_server(
  p_user uuid,
  p_base_revision bigint,
  p_data jsonb,
  p_operation uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_current public.member_game_saves%rowtype;
  v_receipt public.member_game_save_operations%rowtype;
  v_request_hash bytea;
begin
  if p_user is null
     or p_operation is null
     or p_base_revision is null
     or p_base_revision < 0 then
    raise exception 'invalid_game_save_request';
  end if;

  if p_data is null
     or jsonb_typeof(p_data) <> 'object'
     or octet_length(p_data::text) > 180000 then
    raise exception 'invalid_game_save_data';
  end if;

  v_request_hash := extensions.digest(
    pg_catalog.convert_to(p_data::text, 'UTF8'),
    'sha256'
  );

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('member-game-save:' || p_user::text, 0)
  );

  if not exists (
    select 1 from public.member_profiles where user_id = p_user
  ) then
    raise exception 'member_required';
  end if;

  select *
  into v_receipt
  from public.member_game_save_operations
  where user_id = p_user and operation_id = p_operation;

  select *
  into v_current
  from public.member_game_saves
  where user_id = p_user
  for update;

  if v_receipt.operation_id is not null then
    if v_current.user_id is null then
      raise exception 'game_save_receipt_orphan';
    end if;
    if v_receipt.base_revision <> p_base_revision
       or v_receipt.request_hash <> v_request_hash then
      raise exception 'game_save_operation_mismatch';
    end if;
    return jsonb_build_object(
      'ok', true,
      'idempotent', true,
      'conflict', false,
      'accepted_revision', v_receipt.accepted_revision,
      'revision', v_current.revision,
      'data', v_current.data,
      'updated_at', v_current.updated_at
    );
  end if;

  if v_current.user_id is null then
    if p_base_revision <> 0 then
      return jsonb_build_object(
        'ok', false,
        'idempotent', false,
        'conflict', true,
        'revision', 0,
        'data', null,
        'updated_at', null
      );
    end if;

    insert into public.member_game_saves(user_id, data, updated_at, revision)
    values (p_user, p_data, now(), 1)
    returning * into v_current;
  else
    if p_base_revision <> v_current.revision then
      return jsonb_build_object(
        'ok', false,
        'idempotent', false,
        'conflict', true,
        'revision', v_current.revision,
        'data', v_current.data,
        'updated_at', v_current.updated_at
      );
    end if;

    update public.member_game_saves
    set data = p_data,
        updated_at = now(),
        revision = revision + 1
    where user_id = p_user
    returning * into v_current;
  end if;

  insert into public.member_game_save_operations(
    user_id,
    operation_id,
    base_revision,
    request_hash,
    accepted_revision
  ) values (
    p_user,
    p_operation,
    p_base_revision,
    v_request_hash,
    v_current.revision
  );

  delete from public.member_game_save_operations
  where user_id = p_user
    and created_at < now() - interval '90 days';

  return jsonb_build_object(
    'ok', true,
    'idempotent', false,
    'conflict', false,
    'accepted_revision', v_current.revision,
    'revision', v_current.revision,
    'data', v_current.data,
    'updated_at', v_current.updated_at
  );
end
$$;

revoke all on function public.member_game_save_sync_server(uuid, bigint, jsonb, uuid)
  from public, anon, authenticated;
grant execute on function public.member_game_save_sync_server(uuid, bigint, jsonb, uuid)
  to service_role;

comment on function public.member_game_save_sync_server(uuid, bigint, jsonb, uuid)
  is 'Service-only compare-and-swap and idempotency boundary for the authoritative Jeux 3B save.';

-- PostgreSQL historically grants CREATE on public to PUBLIC. Supabase should not
-- depend on that default; migrations remain owned and executed by postgres.
revoke create on schema public from public, anon, authenticated;

commit;
