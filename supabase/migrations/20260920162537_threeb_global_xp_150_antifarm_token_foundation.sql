-- 3B economy hardening: global XP 1-150, anti-farm policies, audit trail,
-- and a completely separate disabled 3BC ledger foundation.

alter table public.economy_accounts
  drop constraint if exists economy_accounts_xp_check;

alter table public.economy_accounts
  add constraint economy_accounts_xp_check
  check (xp >= 0 and xp <= 1000000000);

alter table public.threeb_economy_flags
  add column if not exists unreal_world_enabled boolean not null default false,
  add column if not exists marketplace_enabled boolean not null default false,
  add column if not exists season_enabled boolean not null default false,
  add column if not exists new_economy_enabled boolean not null default true,
  add column if not exists economy_version text not null default '2026.1',
  add column if not exists xp_curve_version text not null default 'global-150-v1';

update public.threeb_economy_flags
set new_economy_enabled = true,
    economy_version = '2026.1',
    xp_curve_version = 'global-150-v1',
    token_enabled = false,
    token_blockchain_enabled = false,
    token_trading_enabled = false,
    updated_at = now()
where singleton = true;

create table if not exists public.threeb_level_curve (
  level smallint primary key check (level between 1 and 150),
  xp_required bigint not null check (xp_required >= 0),
  curve_version text not null,
  created_at timestamptz not null default now(),
  unique (curve_version, xp_required)
);

insert into public.threeb_level_curve(level, xp_required, curve_version)
select level,
       case when level = 1 then 0
            else round(45 * power((level - 1)::numeric, 2.4))::bigint
       end,
       'global-150-v1'
from generate_series(1,150) as level
on conflict (level) do update
set xp_required = excluded.xp_required,
    curve_version = excluded.curve_version;

alter table public.threeb_level_curve enable row level security;
drop policy if exists threeb_level_curve_read on public.threeb_level_curve;
create policy threeb_level_curve_read
on public.threeb_level_curve
for select
to authenticated
using (true);
grant select on public.threeb_level_curve to authenticated;
grant select,insert,update,delete on public.threeb_level_curve to service_role;

create table if not exists public.threeb_reward_policy (
  reward_code text primary key references public.reward_definitions(code) on delete cascade,
  policy_version text not null default '2026.1',
  max_events_per_day integer check (max_events_per_day is null or max_events_per_day >= 0),
  daily_xp_cap integer check (daily_xp_cap is null or daily_xp_cap >= 0),
  daily_coins_cap bigint check (daily_coins_cap is null or daily_coins_cap >= 0),
  cooldown_seconds integer not null default 0 check (cooldown_seconds >= 0),
  diminishing jsonb not null default '[1.0]'::jsonb check (jsonb_typeof(diminishing) = 'array'),
  min_global_level smallint not null default 1 check (min_global_level between 1 and 150),
  sensitive boolean not null default false,
  active boolean not null default true,
  updated_at timestamptz not null default now()
);

insert into public.threeb_reward_policy
(reward_code,policy_version,max_events_per_day,daily_xp_cap,daily_coins_cap,cooldown_seconds,diminishing,min_global_level,sensitive,active)
values
 ('daily_return','2026.1',1,25,5,72000,'[1.0,0.0]',1,false,true),
 ('country_entry','2026.1',8,960,80,60,'[1,1,1,1,1,1,1,1,0]',1,false,true),
 ('city_event','2026.1',8,600,175,300,'[1,0.85,0.7,0.5,0.25,0.1,0,0]',1,false,true),
 ('guardian','2026.1',2,1800,360,600,'[1,1,0]',1,true,true),
 ('mission_main','2026.1',12,5400,960,15,'[1,1,1,1,1,1,1,1,1,1,1,1,0]',1,false,true),
 ('mission_side','2026.1',12,1000,180,30,'[1,1,1,1,1,0.85,0.7,0.5,0.25,0.1,0,0,0]',1,false,true),
 ('nexus_first_build','2026.1',1,60,25,0,'[1,0]',1,false,true),
 ('nexus_unlock','2026.1',1,1200,250,0,'[1,0]',1,true,true),
 ('origin_relay','2026.1',8,1200,160,60,'[1,1,1,1,1,1,1,1,0]',1,false,true),
 ('world_secret','2026.1',16,1280,240,10,'[1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0]',1,false,true),
 ('world_zone','2026.1',25,300,0,15,'[1,0.7,0.4,0.1,0]',1,false,true)
on conflict (reward_code) do update set
 policy_version=excluded.policy_version,
 max_events_per_day=excluded.max_events_per_day,
 daily_xp_cap=excluded.daily_xp_cap,
 daily_coins_cap=excluded.daily_coins_cap,
 cooldown_seconds=excluded.cooldown_seconds,
 diminishing=excluded.diminishing,
 min_global_level=excluded.min_global_level,
 sensitive=excluded.sensitive,
 active=excluded.active,
 updated_at=now();

alter table public.threeb_reward_policy enable row level security;
revoke all on public.threeb_reward_policy from anon, authenticated;
grant select,insert,update,delete on public.threeb_reward_policy to service_role;

alter table public.threeb_wallet_ledger
  add column if not exists source text not null default 'reward',
  add column if not exists economy_version text not null default 'legacy',
  add column if not exists rule_version text,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

create index if not exists threeb_wallet_ledger_user_event_created_idx
on public.threeb_wallet_ledger(user_id,event_key,created_at desc);

create table if not exists public.threeb_economy_anomalies (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users(id) on delete cascade,
  signal text not null check (length(signal) between 3 and 80),
  severity smallint not null check (severity between 1 and 100),
  event_key text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  resolution text
);

alter table public.threeb_economy_anomalies enable row level security;
revoke all on public.threeb_economy_anomalies from anon, authenticated;
grant select,insert,update on public.threeb_economy_anomalies to service_role;

create index if not exists threeb_economy_anomalies_user_created_idx
on public.threeb_economy_anomalies(user_id,created_at desc);

create table if not exists public.threeb_token_ledger (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  event_key text not null check (length(event_key) between 3 and 120),
  event_id text not null check (length(event_id) between 3 and 160),
  amount numeric(38,18) not null check (amount <> 0),
  direction text not null check (direction in ('credit','debit','reversal')),
  source text not null check (length(source) between 2 and 80),
  status text not null default 'pending'
    check (status in ('pending','approved','confirmed','rejected','reversed')),
  economy_version text not null default '2026.1',
  chain_tx_id text unique,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  confirmed_at timestamptz,
  unique(user_id,event_key,event_id)
);

alter table public.threeb_token_ledger enable row level security;
drop policy if exists threeb_token_ledger_read_own on public.threeb_token_ledger;
create policy threeb_token_ledger_read_own
on public.threeb_token_ledger
for select
to authenticated
using ((select auth.uid()) = user_id);

grant select on public.threeb_token_ledger to authenticated;
grant select,insert,update on public.threeb_token_ledger to service_role;

create index if not exists threeb_token_ledger_user_created_idx
on public.threeb_token_ledger(user_id,created_at desc);

create table if not exists public.threeb_token_reward_rules (
  rule_code text primary key,
  label text not null,
  min_global_level smallint not null default 50 check (min_global_level between 1 and 150),
  per_user_lifetime_cap numeric(38,18),
  global_cap numeric(38,18),
  active boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.threeb_token_reward_rules enable row level security;
revoke all on public.threeb_token_reward_rules from anon, authenticated;
grant select,insert,update,delete on public.threeb_token_reward_rules to service_role;

create or replace function public.threeb_level_from_xp(p_xp bigint)
returns integer
language sql
stable
set search_path = ''
as $$
  select coalesce(max(level),1)::integer
  from public.threeb_level_curve
  where curve_version = 'global-150-v1'
    and xp_required <= greatest(coalesce(p_xp,0),0);
$$;

revoke all on function public.threeb_level_from_xp(bigint) from public, anon;
grant execute on function public.threeb_level_from_xp(bigint) to authenticated, service_role;

create or replace function public.threeb_wallet_apply_server(
  p_user uuid,
  p_xp_delta integer default 0,
  p_coins_delta bigint default 0
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_account public.economy_accounts%rowtype;
  v_profile_xp bigint;
  v_base_xp bigint;
  v_new_xp bigint;
  v_new_coins bigint;
  v_level integer;
  v_next_xp bigint;
  v_flags public.threeb_economy_flags%rowtype;
begin
  if p_user is null then raise exception 'invalid_user'; end if;
  if abs(p_xp_delta) > 1000000 or abs(p_coins_delta) > 1000000 then
    raise exception 'wallet_delta_out_of_bounds';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_user::text,0));

  insert into public.economy_accounts(user_id,xp,coins)
  values(p_user,0,0)
  on conflict(user_id) do nothing;

  select * into v_account
  from public.economy_accounts
  where user_id=p_user
  for update;

  select xp into v_profile_xp
  from public.member_profiles
  where user_id=p_user
  for update;

  v_base_xp := greatest(v_account.xp::bigint,coalesce(v_profile_xp,0));
  v_new_xp := least(1000000000::bigint,greatest(0::bigint,v_base_xp+p_xp_delta));
  v_new_coins := v_account.coins+p_coins_delta;
  if v_new_coins < 0 then raise exception 'insufficient_coins'; end if;

  update public.economy_accounts
  set xp=v_new_xp::integer,
      coins=v_new_coins,
      updated_at=now()
  where user_id=p_user
  returning * into v_account;

  update public.member_profiles
  set xp=v_new_xp
  where user_id=p_user;

  select * into v_flags
  from public.threeb_economy_flags
  where singleton=true;

  v_level := public.threeb_level_from_xp(v_new_xp);

  select xp_required into v_next_xp
  from public.threeb_level_curve
  where level = least(150,v_level+1)
    and curve_version=coalesce(v_flags.xp_curve_version,'global-150-v1');

  if v_level >= 150 then v_next_xp := null; end if;

  return jsonb_build_object(
    'xp',v_account.xp,
    'coins',v_account.coins,
    'global_level',v_level,
    'next_level_xp',v_next_xp,
    'economy_version',coalesce(v_flags.economy_version,'2026.1'),
    'xp_curve_version',coalesce(v_flags.xp_curve_version,'global-150-v1'),
    'token',0
  );
end
$$;

revoke all on function public.threeb_wallet_apply_server(uuid,integer,bigint)
from public, anon, authenticated;
grant execute on function public.threeb_wallet_apply_server(uuid,integer,bigint)
to service_role;

create or replace function public.threeb_credit_reward_server(
  p_user_id uuid,
  p_reward_code text,
  p_event_id text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_reward public.reward_definitions%rowtype;
  v_policy public.threeb_reward_policy%rowtype;
  v_flags public.threeb_economy_flags%rowtype;
  v_wallet jsonb;
  v_event_key text;
  v_idempotency text;
  v_today timestamptz;
  v_count integer := 0;
  v_last timestamptz;
  v_xp_today bigint := 0;
  v_coins_today bigint := 0;
  v_factor numeric := 1;
  v_index integer := 0;
  v_xp_delta integer := 0;
  v_coins_delta bigint := 0;
  v_level integer := 1;
begin
  if p_user_id is null
     or p_event_id is null
     or p_event_id !~ '^[A-Za-z0-9:_-]{3,160}$'
     or p_reward_code is null
     or length(p_reward_code) > 80 then
    raise exception 'invalid_reward_request';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text,0));

  select * into v_reward
  from public.reward_definitions
  where code=p_reward_code and active=true;
  if not found then raise exception 'unknown_reward'; end if;

  select * into v_policy
  from public.threeb_reward_policy
  where reward_code=p_reward_code and active=true;
  if not found then raise exception 'reward_policy_missing'; end if;

  select * into v_flags
  from public.threeb_economy_flags
  where singleton=true;

  v_event_key := 'reward:'||p_reward_code;
  v_idempotency := v_event_key||':'||p_event_id;

  v_wallet := public.threeb_wallet_apply_server(p_user_id,0,0);

  if exists(
    select 1 from public.threeb_wallet_ledger
    where user_id=p_user_id
      and event_key=v_event_key
      and event_id=p_event_id
  ) then
    return v_wallet||jsonb_build_object('ok',true,'idempotent',true,'reward_code',p_reward_code);
  end if;

  if not v_reward.repeatable and exists(
    select 1 from public.threeb_wallet_ledger
    where user_id=p_user_id and event_key=v_event_key
  ) then
    raise exception 'reward_already_claimed';
  end if;

  v_level := public.threeb_level_from_xp((v_wallet->>'xp')::bigint);
  if v_level < v_policy.min_global_level then
    raise exception 'reward_level_required';
  end if;

  if coalesce(v_flags.new_economy_enabled,true) then
    v_today := date_trunc('day',now() at time zone 'UTC') at time zone 'UTC';

    select count(*)::integer,
           max(created_at),
           coalesce(sum(greatest(xp_delta,0)),0)::bigint,
           coalesce(sum(greatest(coins_delta,0)),0)::bigint
    into v_count,v_last,v_xp_today,v_coins_today
    from public.threeb_wallet_ledger
    where user_id=p_user_id
      and event_key=v_event_key
      and created_at >= v_today;

    if v_policy.max_events_per_day is not null
       and v_count >= v_policy.max_events_per_day then
      raise exception 'reward_daily_event_cap';
    end if;

    if v_policy.cooldown_seconds > 0
       and v_last is not null
       and v_last > now() - make_interval(secs=>v_policy.cooldown_seconds) then
      raise exception 'reward_cooldown';
    end if;

    if jsonb_array_length(v_policy.diminishing) > 0 then
      v_index := least(v_count,jsonb_array_length(v_policy.diminishing)-1);
      v_factor := greatest(0,least(1,(v_policy.diminishing->>v_index)::numeric));
    end if;
  end if;

  v_xp_delta := round(v_reward.xp * v_factor)::integer;
  v_coins_delta := round(v_reward.coins * v_factor)::bigint;

  if coalesce(v_flags.new_economy_enabled,true) then
    if v_policy.daily_xp_cap is not null then
      v_xp_delta := least(v_xp_delta,greatest(0,v_policy.daily_xp_cap-v_xp_today)::integer);
    end if;
    if v_policy.daily_coins_cap is not null then
      v_coins_delta := least(v_coins_delta,greatest(0,v_policy.daily_coins_cap-v_coins_today));
    end if;
  end if;

  if v_xp_delta = 0 and v_coins_delta = 0 then
    raise exception 'reward_daily_value_cap';
  end if;

  insert into public.threeb_wallet_ledger
  (user_id,event_key,event_id,xp_delta,coins_delta,source,economy_version,rule_version,metadata)
  values(
    p_user_id,v_event_key,p_event_id,v_xp_delta,v_coins_delta,
    'reward',
    coalesce(v_flags.economy_version,'2026.1'),
    v_policy.policy_version,
    jsonb_build_object(
      'reward_code',p_reward_code,
      'factor',v_factor,
      'daily_count_before',v_count,
      'global_level',v_level,
      'sensitive',v_policy.sensitive
    )
  );

  if v_xp_delta <> 0 then
    insert into public.economy_transactions
    (user_id,asset,amount,kind,source,idempotency_key,metadata)
    values(
      p_user_id,'xp',v_xp_delta,'earn','reward',
      v_idempotency,
      jsonb_build_object('reward_code',p_reward_code,'event_id',p_event_id,'economy_version',coalesce(v_flags.economy_version,'2026.1'))
    );
  end if;

  if v_coins_delta <> 0 then
    insert into public.economy_transactions
    (user_id,asset,amount,kind,source,idempotency_key,metadata)
    values(
      p_user_id,'coins',v_coins_delta,'earn','reward',
      v_idempotency,
      jsonb_build_object('reward_code',p_reward_code,'event_id',p_event_id,'economy_version',coalesce(v_flags.economy_version,'2026.1'))
    );
  end if;

  v_wallet := public.threeb_wallet_apply_server(p_user_id,v_xp_delta,v_coins_delta);

  return v_wallet||jsonb_build_object(
    'ok',true,
    'idempotent',false,
    'reward_code',p_reward_code,
    'xp_awarded',v_xp_delta,
    'coins_awarded',v_coins_delta,
    'diminishing_factor',v_factor
  );
end
$$;

revoke all on function public.threeb_credit_reward_server(uuid,text,text)
from public, anon, authenticated;
grant execute on function public.threeb_credit_reward_server(uuid,text,text)
to service_role;

create or replace function public.threeb_progress_snapshot_server(p_user uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_wallet jsonb;
  v_flags public.threeb_economy_flags%rowtype;
begin
  if p_user is null then raise exception 'invalid_user'; end if;

  v_wallet := public.threeb_wallet_apply_server(p_user,0,0);

  select * into v_flags
  from public.threeb_economy_flags
  where singleton=true;

  return v_wallet || jsonb_build_object(
    'token_enabled',coalesce(v_flags.token_enabled,false),
    'token_blockchain_enabled',coalesce(v_flags.token_blockchain_enabled,false),
    'token_trading_enabled',coalesce(v_flags.token_trading_enabled,false),
    'unreal_world_enabled',coalesce(v_flags.unreal_world_enabled,false),
    'marketplace_enabled',coalesce(v_flags.marketplace_enabled,false),
    'season_enabled',coalesce(v_flags.season_enabled,false),
    'new_economy_enabled',coalesce(v_flags.new_economy_enabled,true)
  );
end
$$;

revoke all on function public.threeb_progress_snapshot_server(uuid)
from public, anon, authenticated;
grant execute on function public.threeb_progress_snapshot_server(uuid)
to service_role;
