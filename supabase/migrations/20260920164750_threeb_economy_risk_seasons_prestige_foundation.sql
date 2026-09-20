-- Applied Supabase migration: 20260920164750
-- Economy risk foundation + dormant seasons/prestige. No 3BC activation.

create table if not exists public.threeb_economy_risk_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  risk_score smallint not null default 0 check (risk_score between 0 and 100),
  review_required boolean not null default false,
  last_signal text,
  updated_at timestamptz not null default now()
);

alter table public.threeb_economy_risk_profiles enable row level security;
revoke all on public.threeb_economy_risk_profiles from anon, authenticated;
grant select,insert,update,delete on public.threeb_economy_risk_profiles to service_role;

create table if not exists public.threeb_seasons (
  code text primary key check (code ~ '^[a-z0-9][a-z0-9_-]{2,39}$'),
  label text not null check (length(label) between 2 and 100),
  status text not null default 'draft' check (status in ('draft','active','ended','cancelled')),
  starts_at timestamptz,
  ends_at timestamptz,
  xp_multiplier numeric(6,3) not null default 1 check (xp_multiplier between 0 and 5),
  coins_multiplier numeric(6,3) not null default 1 check (coins_multiplier between 0 and 5),
  token_budget numeric(38,18) not null default 0 check (token_budget >= 0),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at is null or starts_at is null or ends_at > starts_at)
);

alter table public.threeb_seasons enable row level security;
revoke all on public.threeb_seasons from anon, authenticated;
grant select,insert,update,delete on public.threeb_seasons to service_role;

create table if not exists public.threeb_prestige_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  prestige_level smallint not null default 0 check (prestige_level between 0 and 3),
  unlocked_at timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.threeb_prestige_profiles enable row level security;
drop policy if exists threeb_prestige_read_own on public.threeb_prestige_profiles;
create policy threeb_prestige_read_own
on public.threeb_prestige_profiles
for select
to authenticated
using ((select auth.uid())=user_id);

grant select on public.threeb_prestige_profiles to authenticated;
grant select,insert,update,delete on public.threeb_prestige_profiles to service_role;

create or replace function public.threeb_record_economy_anomaly_server(
  p_user uuid,
  p_signal text,
  p_severity integer,
  p_event_key text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  v_score integer;
  v_review boolean;
  v_increment integer;
begin
  if p_user is null
     or p_signal is null
     or length(p_signal)<3
     or length(p_signal)>80
     or p_severity<1
     or p_severity>100
     or p_metadata is null
     or jsonb_typeof(p_metadata)<>'object' then
    raise exception 'invalid_anomaly_signal';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_user::text,17));

  insert into public.threeb_economy_anomalies
    (user_id,signal,severity,event_key,metadata)
  values
    (p_user,p_signal,p_severity,p_event_key,coalesce(p_metadata,'{}'::jsonb));

  v_increment:=greatest(1,ceil(p_severity::numeric/5)::integer);

  insert into public.threeb_economy_risk_profiles
    (user_id,risk_score,review_required,last_signal,updated_at)
  values
    (p_user,least(100,v_increment),v_increment>=16,p_signal,now())
  on conflict(user_id) do update
  set risk_score=least(100,public.threeb_economy_risk_profiles.risk_score+v_increment),
      review_required=(least(100,public.threeb_economy_risk_profiles.risk_score+v_increment)>=80),
      last_signal=p_signal,
      updated_at=now()
  returning risk_score,review_required into v_score,v_review;

  return jsonb_build_object(
    'risk_score',v_score,
    'review_required',v_review,
    'sensitive_rewards_held',v_score>=50
  );
end
$$;

revoke all on function public.threeb_record_economy_anomaly_server(uuid,text,integer,text,jsonb)
from public,anon,authenticated;
grant execute on function public.threeb_record_economy_anomaly_server(uuid,text,integer,text,jsonb)
to service_role;

create or replace function public.threeb_economy_risk_snapshot_server(p_user uuid)
returns jsonb
language sql
security definer
stable
set search_path=''
as $$
  select jsonb_build_object(
    'risk_score',coalesce(r.risk_score,0),
    'review_required',coalesce(r.review_required,false),
    'sensitive_rewards_held',coalesce(r.risk_score,0)>=50
  )
  from (select 1) x
  left join public.threeb_economy_risk_profiles r on r.user_id=p_user;
$$;

revoke all on function public.threeb_economy_risk_snapshot_server(uuid)
from public,anon,authenticated;
grant execute on function public.threeb_economy_risk_snapshot_server(uuid)
to service_role;

create or replace function public.threeb_economy_review_server(
  p_user uuid,
  p_new_score integer,
  p_resolution text
)
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  v_score integer:=greatest(0,least(100,coalesce(p_new_score,0)));
begin
  if p_user is null or p_resolution is null or length(trim(p_resolution))<3 or length(p_resolution)>240 then
    raise exception 'invalid_review';
  end if;

  insert into public.threeb_economy_risk_profiles
    (user_id,risk_score,review_required,last_signal,updated_at)
  values
    (p_user,v_score,v_score>=80,'manual_review',now())
  on conflict(user_id) do update
  set risk_score=v_score,
      review_required=v_score>=80,
      last_signal='manual_review',
      updated_at=now();

  update public.threeb_economy_anomalies
  set reviewed_at=coalesce(reviewed_at,now()),
      resolution=coalesce(resolution,p_resolution)
  where user_id=p_user and reviewed_at is null;

  return jsonb_build_object(
    'risk_score',v_score,
    'review_required',v_score>=80,
    'sensitive_rewards_held',v_score>=50
  );
end
$$;

revoke all on function public.threeb_economy_review_server(uuid,integer,text)
from public,anon,authenticated;
grant execute on function public.threeb_economy_review_server(uuid,integer,text)
to service_role;
