create table if not exists public.threeb_prestige_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  event_id text not null check (event_id ~ '^[A-Za-z0-9:_-]{3,160}$'),
  prestige_before smallint not null check (prestige_before between 0 and 3),
  prestige_after smallint not null check (prestige_after between 0 and 3),
  created_at timestamptz not null default now(),
  unique(user_id,event_id)
);

alter table public.threeb_prestige_events enable row level security;
revoke all on public.threeb_prestige_events from anon,authenticated;
grant select,insert on public.threeb_prestige_events to service_role;

create index if not exists threeb_prestige_events_user_created_idx
on public.threeb_prestige_events(user_id,created_at desc);

create or replace function public.threeb_progress_title(p_level integer,p_prestige integer default 0)
returns text
language sql
immutable
set search_path=''
as $$
  select case
    when coalesce(p_prestige,0) >= 3 then 'Légende 3B · Prestige III'
    when coalesce(p_prestige,0) = 2 then 'Légende 3B · Prestige II'
    when coalesce(p_prestige,0) = 1 then 'Légende 3B · Prestige I'
    when coalesce(p_level,1) >= 150 then 'Légende 3B'
    when coalesce(p_level,1) >= 130 then 'Héritier des Huit'
    when coalesce(p_level,1) >= 100 then 'Maître des Portes'
    when coalesce(p_level,1) >= 60 then 'Sentinelle'
    when coalesce(p_level,1) >= 30 then 'Gardien'
    when coalesce(p_level,1) >= 10 then 'Héritier'
    else 'Voyageur'
  end;
$$;

revoke all on function public.threeb_progress_title(integer,integer) from public,anon;
grant execute on function public.threeb_progress_title(integer,integer) to authenticated,service_role;

create or replace function public.threeb_unlock_prestige_server(
  p_user uuid,
  p_event_id text
)
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  v_wallet jsonb;
  v_level integer;
  v_before integer;
  v_after integer;
begin
  if p_user is null
     or p_event_id is null
     or p_event_id !~ '^[A-Za-z0-9:_-]{3,160}$' then
    raise exception 'invalid_prestige_request';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_user::text,29));

  if exists(
    select 1 from public.threeb_prestige_events
    where user_id=p_user and event_id=p_event_id
  ) then
    select prestige_level into v_after
    from public.threeb_prestige_profiles
    where user_id=p_user;
    return jsonb_build_object(
      'ok',true,
      'idempotent',true,
      'prestige_level',coalesce(v_after,0)
    );
  end if;

  v_wallet:=public.threeb_wallet_apply_server(p_user,0,0);
  v_level:=coalesce((v_wallet->>'global_level')::integer,1);

  if v_level<150 then
    raise exception 'prestige_level_150_required';
  end if;

  insert into public.threeb_prestige_profiles(user_id,prestige_level,updated_at)
  values(p_user,0,now())
  on conflict(user_id) do nothing;

  select prestige_level into v_before
  from public.threeb_prestige_profiles
  where user_id=p_user
  for update;

  if v_before>=3 then
    raise exception 'prestige_max';
  end if;

  v_after:=v_before+1;

  update public.threeb_prestige_profiles
  set prestige_level=v_after,
      unlocked_at=coalesce(unlocked_at,now()),
      updated_at=now()
  where user_id=p_user;

  insert into public.threeb_prestige_events
    (user_id,event_id,prestige_before,prestige_after)
  values
    (p_user,p_event_id,v_before,v_after);

  return jsonb_build_object(
    'ok',true,
    'idempotent',false,
    'prestige_level',v_after,
    'title',public.threeb_progress_title(v_level,v_after)
  );
end
$$;

revoke all on function public.threeb_unlock_prestige_server(uuid,text)
from public,anon,authenticated;
grant execute on function public.threeb_unlock_prestige_server(uuid,text)
to service_role;

create or replace function public.threeb_progress_snapshot_server(p_user uuid)
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  v_wallet jsonb;
  v_flags public.threeb_economy_flags%rowtype;
  v_prestige integer:=0;
  v_level integer:=1;
  v_title text;
  v_season jsonb:=null;
begin
  if p_user is null then raise exception 'invalid_user'; end if;

  v_wallet:=public.threeb_wallet_apply_server(p_user,0,0);
  v_level:=coalesce((v_wallet->>'global_level')::integer,1);

  select * into v_flags
  from public.threeb_economy_flags
  where singleton=true;

  select coalesce(prestige_level,0) into v_prestige
  from public.threeb_prestige_profiles
  where user_id=p_user;

  v_prestige:=coalesce(v_prestige,0);
  v_title:=public.threeb_progress_title(v_level,v_prestige);

  if coalesce(v_flags.season_enabled,false) then
    select jsonb_build_object(
      'code',code,
      'label',label,
      'starts_at',starts_at,
      'ends_at',ends_at,
      'xp_multiplier',xp_multiplier,
      'coins_multiplier',coins_multiplier
    )
    into v_season
    from public.threeb_seasons
    where status='active'
      and (starts_at is null or starts_at<=now())
      and (ends_at is null or ends_at>now())
    order by starts_at nulls first,code
    limit 1;
  end if;

  return v_wallet||jsonb_build_object(
    'prestige_level',v_prestige,
    'title',v_title,
    'season',v_season,
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
from public,anon,authenticated;
grant execute on function public.threeb_progress_snapshot_server(uuid)
to service_role;
