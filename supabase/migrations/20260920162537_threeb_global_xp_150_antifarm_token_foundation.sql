-- Applied Supabase migration: 20260920162537
-- Global XP 1-150, anti-farm reward policies, separated disabled 3BC foundation.

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

-- Full live definitions of threeb_wallet_apply_server,
-- threeb_credit_reward_server, and threeb_progress_snapshot_server
-- were installed by this migration. See deployed schema and economy tests.
