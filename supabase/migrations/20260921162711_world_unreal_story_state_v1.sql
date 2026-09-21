begin;

create table public.world_unreal_story_state (
  user_id uuid not null references auth.users(id) on delete cascade,
  slice_id text not null check (slice_id ~ '^[a-z0-9_]{3,64}$'),
  revision bigint not null default 0 check (revision >= 0),
  state jsonb not null default '{}'::jsonb
    check (jsonb_typeof(state) = 'object' and octet_length(state::text) <= 65536),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, slice_id)
);

create table public.world_unreal_story_receipts (
  event_id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  slice_id text not null check (slice_id ~ '^[a-z0-9_]{3,64}$'),
  event_type text not null check (event_type ~ '^[a-z0-9_.:-]{3,96}$'),
  prior_revision bigint not null check (prior_revision >= 0),
  new_revision bigint not null check (new_revision > prior_revision),
  state_sha256 text not null check (state_sha256 ~ '^[0-9a-f]{64}$'),
  response jsonb not null check (jsonb_typeof(response) = 'object'),
  created_at timestamptz not null default now()
);

create index world_unreal_story_state_updated_idx
  on public.world_unreal_story_state(updated_at desc);

create index world_unreal_story_receipts_user_slice_created_idx
  on public.world_unreal_story_receipts(user_id, slice_id, created_at desc);

alter table public.world_unreal_story_state enable row level security;
alter table public.world_unreal_story_receipts enable row level security;

revoke all on public.world_unreal_story_state from public, anon, authenticated;
revoke all on public.world_unreal_story_receipts from public, anon, authenticated;
grant select, insert, update, delete on public.world_unreal_story_state to service_role;
grant select, insert on public.world_unreal_story_receipts to service_role;

create or replace function public.world_unreal_story_commit_server(
  p_user uuid,
  p_slice_id text,
  p_expected_revision bigint,
  p_event_id uuid,
  p_event_type text,
  p_state jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path=''
as $$
declare
  v_current_revision bigint;
  v_new_revision bigint;
  v_state_sha256 text;
  v_existing_user uuid;
  v_existing_slice text;
  v_existing_type text;
  v_existing_prior bigint;
  v_existing_hash text;
  v_existing_response jsonb;
  v_response jsonb;
begin
  if p_user is null
     or p_event_id is null
     or p_slice_id is null
     or p_slice_id !~ '^[a-z0-9_]{3,64}$'
     or p_event_type is null
     or p_event_type !~ '^[a-z0-9_.:-]{3,96}$'
     or p_expected_revision is null
     or p_expected_revision < 0
     or p_state is null
     or jsonb_typeof(p_state) <> 'object'
     or octet_length(p_state::text) > 65536
  then
    raise exception 'invalid_unreal_story_commit';
  end if;

  if not exists (select 1 from auth.users where id = p_user) then
    raise exception 'unknown_unreal_story_user';
  end if;

  v_state_sha256 := pg_catalog.encode(
    extensions.digest(p_state::text, 'sha256'),
    'hex'
  );

  perform pg_advisory_xact_lock(
    hashtextextended(p_user::text || ':' || p_slice_id, 0)
  );

  select user_id, slice_id, event_type, prior_revision, state_sha256, response
  into v_existing_user, v_existing_slice, v_existing_type, v_existing_prior, v_existing_hash, v_existing_response
  from public.world_unreal_story_receipts
  where event_id = p_event_id;

  if found then
    if v_existing_user <> p_user
       or v_existing_slice <> p_slice_id
       or v_existing_type <> p_event_type
       or v_existing_prior <> p_expected_revision
       or v_existing_hash <> v_state_sha256
    then
      raise exception 'unreal_story_event_id_conflict';
    end if;

    return v_existing_response || jsonb_build_object('duplicate', true);
  end if;

  select revision
  into v_current_revision
  from public.world_unreal_story_state
  where user_id = p_user and slice_id = p_slice_id
  for update;

  if not found then
    if p_expected_revision <> 0 then
      raise exception 'unreal_story_revision_conflict';
    end if;

    v_new_revision := 1;
    insert into public.world_unreal_story_state(
      user_id, slice_id, revision, state, created_at, updated_at
    ) values (
      p_user, p_slice_id, v_new_revision, p_state, now(), now()
    );
  else
    if v_current_revision <> p_expected_revision then
      raise exception 'unreal_story_revision_conflict';
    end if;

    v_new_revision := v_current_revision + 1;
    update public.world_unreal_story_state
    set revision = v_new_revision,
        state = p_state,
        updated_at = now()
    where user_id = p_user and slice_id = p_slice_id;
  end if;

  v_response := jsonb_build_object(
    'ok', true,
    'duplicate', false,
    'event_id', p_event_id,
    'event_type', p_event_type,
    'slice_id', p_slice_id,
    'revision', v_new_revision
  );

  insert into public.world_unreal_story_receipts(
    event_id, user_id, slice_id, event_type,
    prior_revision, new_revision, state_sha256, response
  ) values (
    p_event_id, p_user, p_slice_id, p_event_type,
    p_expected_revision, v_new_revision, v_state_sha256, v_response
  );

  return v_response;
end
$$;

revoke all on function public.world_unreal_story_commit_server(uuid,text,bigint,uuid,text,jsonb)
  from public, anon, authenticated;
grant execute on function public.world_unreal_story_commit_server(uuid,text,bigint,uuid,text,jsonb)
  to service_role;

comment on table public.world_unreal_story_state is
  'Authoritative Unreal story snapshots. Service-only; clients have no table policies or grants.';
comment on table public.world_unreal_story_receipts is
  'Immutable idempotency/audit receipts for trusted Unreal story commits. No gameplay rewards are granted here.';
comment on function public.world_unreal_story_commit_server(uuid,text,bigint,uuid,text,jsonb) is
  'Service-only compare-and-swap persistence. A trusted game server must validate gameplay before calling.';

commit;
