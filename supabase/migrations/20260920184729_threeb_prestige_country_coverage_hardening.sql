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
  v_seal_countries integer:=0;
  v_memory_countries integer:=0;
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

  select count(distinct value)::integer
  into v_seal_countries
  from jsonb_array_elements_text(coalesce(v_world->'seals','[]'::jsonb))
  where value in ('france','italie','estonie','turquie','algerie','tunisie','maroc','espagne');

  select count(distinct split_part(value,':',1))::integer
  into v_memory_countries
  from jsonb_array_elements_text(coalesce(v_world->'beacons','[]'::jsonb))
  where split_part(value,':',1) in ('france','italie','estonie','turquie','algerie','tunisie','maroc','espagne');

  select count(distinct value)::integer
  into v_secrets
  from jsonb_array_elements_text(coalesce(v_world#>'{hub,secrets}','[]'::jsonb));

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

  select count(distinct d.country)::integer
  into v_unlocked_districts
  from public.nexus_city_districts d
  join public.nexus_cities c on c.city_id=d.city_id
  where c.user_id=p_user
    and d.unlocked=true
    and d.country in ('France','Italie','Estonie','Turquie','Algérie','Tunisie','Maroc','Espagne');

  v_next:=least(3,v_current+1);

  if v_current=0 then
    v_eligible:=(
      v_level>=150
      and v_seal_countries=8
      and v_memory_countries=8
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
      and v_unlocked_districts=8
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
    'seal_countries',v_seal_countries,
    'memory_countries',v_memory_countries,
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
