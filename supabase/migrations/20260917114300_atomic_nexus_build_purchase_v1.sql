alter table public.nexus_city_placements add column if not exists upgrade_level smallint not null default 1 check (upgrade_level between 1 and 5);
create unique index if not exists nexus_city_placements_request_unique on public.nexus_city_placements(city_id,request_id) where request_id is not null;
create or replace function public.nexus_purchase_and_place_building(p_building_code text,p_x integer,p_z integer,p_rotation smallint default 0,p_request_id uuid default gen_random_uuid()) returns jsonb language plpgsql security definer set search_path=public as $$
declare v_uid uuid:=auth.uid();v_account public.economy_accounts%rowtype;v_city public.nexus_cities%rowtype;v_build public.nexus_city_buildings%rowtype;v_existing public.nexus_city_placements%rowtype;v_level integer;v_placement_id uuid;
begin
 if v_uid is null then raise exception 'authentication_required'; end if;
 if p_request_id is null then raise exception 'request_id_required'; end if;
 if p_x not between -500 and 500 or p_z not between -500 and 500 then raise exception 'placement_out_of_bounds'; end if;
 if mod(((p_rotation::integer%360)+360)%360,15)<>0 then raise exception 'invalid_rotation'; end if;
 select * into v_account from public.economy_accounts where user_id=v_uid for update;
 if not found then insert into public.economy_accounts(user_id,xp,coins) values(v_uid,0,0) returning * into v_account; end if;
 select * into v_city from public.nexus_cities where user_id=v_uid for update;
 if not found then raise exception 'nexus_city_required'; end if;
 select * into v_existing from public.nexus_city_placements where city_id=v_city.city_id and request_id=p_request_id;
 if found then return jsonb_build_object('ok',true,'idempotent',true,'placement_id',v_existing.id,'coins',v_account.coins,'xp',v_account.xp,'token',0); end if;
 select * into v_build from public.nexus_city_buildings where code=p_building_code and active=true;
 if not found then raise exception 'unknown_building'; end if;
 v_level:=least(150,greatest(1,floor(sqrt(greatest(v_account.xp,0)::numeric/110))+1));
 if v_level<v_build.unlock_level then raise exception 'level_required'; end if;
 if v_account.coins<v_build.cost_coins then raise exception 'insufficient_coins'; end if;
 update public.economy_accounts set coins=coins-v_build.cost_coins,updated_at=now() where user_id=v_uid returning * into v_account;
 insert into public.nexus_city_placements(city_id,building_code,x,z,rotation,footprint_w,footprint_h,request_id,upgrade_level) values(v_city.city_id,v_build.code,p_x,p_z,(((p_rotation::integer%360)+360)%360)::smallint,greatest(1,coalesce((v_build.footprint->>'w')::smallint,1)),greatest(1,coalesce((v_build.footprint->>'h')::smallint,1)),p_request_id,1) returning id into v_placement_id;
 insert into public.nexus_city_journal(city_id,user_id,action,reference_id,coins,metadata) values(v_city.city_id,v_uid,'build_purchase',v_placement_id,-v_build.cost_coins,jsonb_build_object('building_code',v_build.code,'request_id',p_request_id,'token',0));
 insert into public.threeb_wallet_ledger(user_id,event_key,event_id,xp_delta,coins_delta) values(v_uid,'nexus_build_purchase',p_request_id::text,0,-least(v_build.cost_coins,1000000)) on conflict(user_id,event_key,event_id) do nothing;
 update public.nexus_cities set revision=revision+1,updated_at=now() where user_id=v_uid;
 return jsonb_build_object('ok',true,'idempotent',false,'placement_id',v_placement_id,'coins',v_account.coins,'xp',v_account.xp,'level',v_level,'token',0,'revision',v_city.revision+1);
end$$;
revoke all on function public.nexus_purchase_and_place_building(text,integer,integer,smallint,uuid) from public;
grant execute on function public.nexus_purchase_and_place_building(text,integer,integer,smallint,uuid) to authenticated;
