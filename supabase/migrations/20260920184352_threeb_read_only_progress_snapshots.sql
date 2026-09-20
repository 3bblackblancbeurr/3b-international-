create or replace function public.threeb_wallet_snapshot_server(p_user uuid)
returns jsonb
language plpgsql
security definer
stable
set search_path=''
as $$
declare
  v_profile_xp bigint:=0;
  v_account_xp bigint:=0;
  v_coins bigint:=0;
  v_xp bigint:=0;
  v_level integer:=1;
  v_next_xp bigint;
  v_flags public.threeb_economy_flags%rowtype;
begin
  if p_user is null then raise exception 'invalid_user'; end if;

  select coalesce(xp,0)::bigint
  into v_profile_xp
  from public.member_profiles
  where user_id=p_user;
  v_profile_xp:=coalesce(v_profile_xp,0);

  select coalesce(xp,0)::bigint,coalesce(coins,0)::bigint
  into v_account_xp,v_coins
  from public.economy_accounts
  where user_id=p_user;
  v_account_xp:=coalesce(v_account_xp,0);
  v_coins:=coalesce(v_coins,0);

  v_xp:=greatest(v_profile_xp,v_account_xp);

  select * into v_flags
  from public.threeb_economy_flags
  where singleton=true;

  v_level:=public.threeb_level_from_xp(v_xp);

  select xp_required
  into v_next_xp
  from public.threeb_level_curve
  where curve_version=coalesce(v_flags.xp_curve_version,'global-150-v1')
    and level=least(150,v_level+1);

  if v_level>=150 then v_next_xp:=null; end if;

  return jsonb_build_object(
    'xp',v_xp,
    'coins',v_coins,
    'global_level',v_level,
    'next_level_xp',v_next_xp,
    'economy_version',coalesce(v_flags.economy_version,'2026.1'),
    'xp_curve_version',coalesce(v_flags.xp_curve_version,'global-150-v1'),
    'token',0
  );
end
$$;

revoke all on function public.threeb_wallet_snapshot_server(uuid)
from public,anon,authenticated;
grant execute on function public.threeb_wallet_snapshot_server(uuid)
to service_role;

create or replace function public.threeb_prestige_eligibility_server(p_user uuid)
returns jsonb
language plpgsql
security definer
stable
set search_path=''
as $$
declare
  v_wallet jsonb;
  v_level integer:=1;
  v_current integer:=0;
  v_next integer:=1;
  v_world jsonb:='{}'::jsonb;
  v_seals integer:=0;
  v_memories integer:=0;
  v_secrets integer:=0;
  v_claimed_missions integer:=0;
  v_world_final boolean:=false;
  v_city_level integer:=0;
  v_unlocked_districts integer:=0;
  v_eligible boolean:=false;
begin
  if p_user is null then raise exception 'invalid_user'; end if;

  v_wallet:=public.threeb_wallet_snapshot_server(p_user);
  v_level:=coalesce((v_wallet->>'global_level')::integer,1);

  select coalesce(prestige_level,0)
  into v_current
  from public.threeb_prestige_profiles
  where user_id=p_user;
  v_current:=coalesce(v_current,0);

  select coalesce(data,'{}'::jsonb)
  into v_world
  from public.member_world_state
  where user_id=p_user;

  v_world:=coalesce(v_world,'{}'::jsonb);
  v_seals:=jsonb_array_length(coalesce(v_world->'seals','[]'::jsonb));
  v_memories:=jsonb_array_length(coalesce(v_world->'beacons','[]'::jsonb));
  v_secrets:=jsonb_array_length(coalesce(v_world#>'{hub,secrets}','[]'::jsonb));

  select count(*)::integer
  into v_claimed_missions
  from jsonb_each(coalesce(v_world#>'{hub,missions}','{}'::jsonb))
  where coalesce(value->>'claimed','false')='true';

  select exists(
    select 1
    from public.threeb_wallet_ledger
    where user_id=p_user
      and event_key='reward:world_final'
  )
  into v_world_final;

  select coalesce(city_level,0)
  into v_city_level
  from public.nexus_cities
  where user_id=p_user;
  v_city_level:=coalesce(v_city_level,0);

  select count(*)::integer
  into v_unlocked_districts
  from public.nexus_city_districts d
  join public.nexus_cities c on c.city_id=d.city_id
  where c.user_id=p_user and d.unlocked=true;

  v_next:=least(3,v_current+1);

  if v_current=0 then
    v_eligible:=(
      v_level>=150
      and v_seals>=8
      and v_memories>=8
      and v_world_final
    );
  elsif v_current=1 then
    v_eligible:=(
      v_level>=150
      and v_secrets>=16
      and v_claimed_missions>=20
    );
  elsif v_current=2 then
    v_eligible:=(
      v_level>=150
      and v_city_level>=8
      and v_unlocked_districts>=8
    );
  else
    v_eligible:=false;
    v_next:=3;
  end if;

  return jsonb_build_object(
    'current_prestige',v_current,
    'next_prestige',v_next,
    'eligible',v_eligible,
    'level',v_level,
    'seals',v_seals,
    'memories',v_memories,
    'hub_secrets',v_secrets,
    'claimed_hub_missions',v_claimed_missions,
    'world_final',v_world_final,
    'city_level',v_city_level,
    'unlocked_city_districts',v_unlocked_districts
  );
end
$$;

revoke all on function public.threeb_prestige_eligibility_server(uuid)
from public,anon,authenticated;
grant execute on function public.threeb_prestige_eligibility_server(uuid)
to service_role;

create or replace function public.threeb_progress_snapshot_server(p_user uuid)
returns jsonb
language plpgsql
security definer
stable
set search_path=''
as $$
declare
  v_wallet jsonb;
  v_flags public.threeb_economy_flags%rowtype;
  v_prestige integer:=0;
  v_level integer:=1;
  v_title text;
  v_season jsonb:=null;
  v_eligibility jsonb;
begin
  if p_user is null then raise exception 'invalid_user'; end if;

  v_wallet:=public.threeb_wallet_snapshot_server(p_user);
  v_level:=coalesce((v_wallet->>'global_level')::integer,1);

  select * into v_flags
  from public.threeb_economy_flags
  where singleton=true;

  select coalesce(prestige_level,0)
  into v_prestige
  from public.threeb_prestige_profiles
  where user_id=p_user;

  v_prestige:=coalesce(v_prestige,0);
  v_title:=public.threeb_progress_title(v_level,v_prestige);
  v_eligibility:=public.threeb_prestige_eligibility_server(p_user);

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
    'prestige_eligible',coalesce((v_eligibility->>'eligible')::boolean,false),
    'next_prestige_level',coalesce((v_eligibility->>'next_prestige')::integer,least(3,v_prestige+1)),
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
