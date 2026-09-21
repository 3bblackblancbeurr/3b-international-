create table if not exists public.control_center_settings (
  singleton boolean primary key default true check (singleton),
  enabled boolean not null default true,
  owner_email text,
  max_devices smallint not null default 3 check (max_devices between 1 and 8),
  pairing_ttl_seconds integer not null default 600 check (pairing_ttl_seconds between 120 and 1800),
  updated_at timestamptz not null default now()
);

insert into public.control_center_settings(singleton,enabled,owner_email,max_devices,pairing_ttl_seconds)
select true,true,owner_email,3,600
from public.ai_council_settings
where singleton=true
on conflict (singleton) do update set
  owner_email=coalesce(excluded.owner_email,public.control_center_settings.owner_email),
  updated_at=now();

create table if not exists public.control_center_devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  platform text not null check (char_length(platform) between 1 and 40),
  agent_version text not null default '1',
  capabilities jsonb not null default '{}'::jsonb
    check (jsonb_typeof(capabilities)='object' and octet_length(capabilities::text)<=8192),
  token_hash text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  paired_at timestamptz not null default now(),
  last_seen_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists control_center_devices_user_active_idx
  on public.control_center_devices(user_id,revoked_at,last_seen_at desc);

create table if not exists public.control_center_pairings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  code_hash text not null unique check (code_hash ~ '^[0-9a-f]{64}$'),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  used_at timestamptz,
  device_id uuid references public.control_center_devices(id) on delete set null
);

create index if not exists control_center_pairings_user_expiry_idx
  on public.control_center_pairings(user_id,expires_at desc);

create table if not exists public.control_center_commands (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  device_id uuid not null references public.control_center_devices(id) on delete cascade,
  command_type text not null check (command_type in (
    'ping','system_status','open_3b','open_repo','open_unreal',
    'unreal_health','open_github','open_supabase'
  )),
  payload jsonb not null default '{}'::jsonb
    check (jsonb_typeof(payload)='object' and octet_length(payload::text)<=4096),
  status text not null default 'pending'
    check (status in ('pending','claimed','succeeded','failed','cancelled','expired')),
  issued_at timestamptz not null default now(),
  expires_at timestamptz not null default (now()+interval '2 minutes'),
  claimed_at timestamptz,
  completed_at timestamptz,
  result jsonb not null default '{}'::jsonb
    check (jsonb_typeof(result)='object' and octet_length(result::text)<=16384),
  error_message text
);

create index if not exists control_center_commands_device_status_idx
  on public.control_center_commands(device_id,status,issued_at);
create index if not exists control_center_commands_user_created_idx
  on public.control_center_commands(user_id,issued_at desc);

create table if not exists public.control_center_events (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users(id) on delete set null,
  device_id uuid references public.control_center_devices(id) on delete set null,
  event_type text not null check (event_type ~ '^[a-z0-9_.:-]{3,64}$'),
  detail jsonb not null default '{}'::jsonb
    check (jsonb_typeof(detail)='object' and octet_length(detail::text)<=4096),
  created_at timestamptz not null default now()
);

create index if not exists control_center_events_user_created_idx
  on public.control_center_events(user_id,created_at desc);

alter table public.control_center_settings enable row level security;
alter table public.control_center_devices enable row level security;
alter table public.control_center_pairings enable row level security;
alter table public.control_center_commands enable row level security;
alter table public.control_center_events enable row level security;

revoke all on public.control_center_settings from public,anon,authenticated;
revoke all on public.control_center_devices from public,anon,authenticated;
revoke all on public.control_center_pairings from public,anon,authenticated;
revoke all on public.control_center_commands from public,anon,authenticated;
revoke all on public.control_center_events from public,anon,authenticated;

grant select,insert,update,delete on public.control_center_settings to service_role;
grant select,insert,update,delete on public.control_center_devices to service_role;
grant select,insert,update,delete on public.control_center_pairings to service_role;
grant select,insert,update,delete on public.control_center_commands to service_role;
grant select,insert on public.control_center_events to service_role;

create or replace function public.control_center_pair_device(
  p_user uuid,
  p_code_hash text,
  p_device_name text,
  p_platform text,
  p_agent_version text,
  p_capabilities jsonb,
  p_token_hash text
)
returns uuid
language plpgsql
security invoker
set search_path=''
as $$
declare
  v_pair public.control_center_pairings%rowtype;
  v_device uuid;
  v_max smallint;
begin
  select max_devices into v_max
  from public.control_center_settings
  where singleton=true and enabled=true;

  if v_max is null then
    raise exception 'control_center_disabled';
  end if;

  select * into v_pair
  from public.control_center_pairings
  where code_hash=p_code_hash
  for update;

  if not found or v_pair.user_id<>p_user or v_pair.used_at is not null or v_pair.expires_at<=now() then
    raise exception 'invalid_pairing_code';
  end if;

  if (
    select count(*) from public.control_center_devices
    where user_id=p_user and revoked_at is null
  ) >= v_max then
    raise exception 'device_limit_reached';
  end if;

  insert into public.control_center_devices(
    user_id,name,platform,agent_version,capabilities,token_hash,last_seen_at
  ) values (
    p_user,
    left(coalesce(p_device_name,'PC 3B'),80),
    left(coalesce(p_platform,'unknown'),40),
    left(coalesce(p_agent_version,'1'),40),
    coalesce(p_capabilities,'{}'::jsonb),
    p_token_hash,
    now()
  )
  returning id into v_device;

  update public.control_center_pairings
  set used_at=now(),device_id=v_device
  where id=v_pair.id;

  return v_device;
end
$$;

create or replace function public.control_center_claim_command(p_device uuid)
returns jsonb
language plpgsql
security invoker
set search_path=''
as $$
declare
  v_command public.control_center_commands%rowtype;
begin
  if not exists (
    select 1 from public.control_center_devices
    where id=p_device and revoked_at is null
  ) then
    return null;
  end if;

  update public.control_center_commands
  set status='expired',completed_at=now()
  where device_id=p_device and status='pending' and expires_at<=now();

  select * into v_command
  from public.control_center_commands
  where device_id=p_device and status='pending' and expires_at>now()
  order by issued_at
  for update skip locked
  limit 1;

  if not found then
    return null;
  end if;

  update public.control_center_commands
  set status='claimed',claimed_at=now()
  where id=v_command.id;

  return jsonb_build_object(
    'id',v_command.id,
    'command_type',v_command.command_type,
    'payload',v_command.payload,
    'issued_at',v_command.issued_at,
    'expires_at',v_command.expires_at
  );
end
$$;

create or replace function public.control_center_complete_command(
  p_device uuid,
  p_command uuid,
  p_ok boolean,
  p_result jsonb,
  p_error text
)
returns boolean
language plpgsql
security invoker
set search_path=''
as $$
begin
  update public.control_center_commands
  set status=case when p_ok then 'succeeded' else 'failed' end,
      result=coalesce(p_result,'{}'::jsonb),
      error_message=case when p_ok then null else left(coalesce(p_error,'Command failed'),500) end,
      completed_at=now()
  where id=p_command
    and device_id=p_device
    and status='claimed';

  return found;
end
$$;

create or replace function public.control_center_touch_device(
  p_device uuid,
  p_agent_version text,
  p_capabilities jsonb
)
returns boolean
language plpgsql
security invoker
set search_path=''
as $$
begin
  update public.control_center_devices
  set last_seen_at=now(),
      agent_version=left(coalesce(p_agent_version,agent_version),40),
      capabilities=coalesce(p_capabilities,capabilities),
      updated_at=now()
  where id=p_device and revoked_at is null;
  return found;
end
$$;

revoke all on function public.control_center_pair_device(uuid,text,text,text,text,jsonb,text)
  from public,anon,authenticated;
revoke all on function public.control_center_claim_command(uuid)
  from public,anon,authenticated;
revoke all on function public.control_center_complete_command(uuid,uuid,boolean,jsonb,text)
  from public,anon,authenticated;
revoke all on function public.control_center_touch_device(uuid,text,jsonb)
  from public,anon,authenticated;

grant execute on function public.control_center_pair_device(uuid,text,text,text,text,jsonb,text) to service_role;
grant execute on function public.control_center_claim_command(uuid) to service_role;
grant execute on function public.control_center_complete_command(uuid,uuid,boolean,jsonb,text) to service_role;
grant execute on function public.control_center_touch_device(uuid,text,jsonb) to service_role;

comment on table public.control_center_devices is
  'Owner-only 3B control center paired devices. Device tokens are stored only as SHA-256 hashes.';
comment on table public.control_center_commands is
  'Allowlisted remote commands only. Arbitrary shell commands are intentionally unsupported.';
