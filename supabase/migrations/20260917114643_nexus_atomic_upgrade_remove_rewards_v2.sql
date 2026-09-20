insert into public.reward_definitions(code,label,xp,coins,active,repeatable) values
('world_zone','Découverte de zone',20,0,true,true),
('world_secret','Secret découvert',80,15,true,true),
('origin_relay','Relais Origine activé',150,20,true,true),
('country_entry','Entrée dans un monde-pays',120,10,true,true),
('mission_main','Mission principale',450,80,true,true),
('mission_side','Mission secondaire',140,25,true,true),
('guardian','Mission Gardien',900,180,true,true),
('nexus_unlock','Nexus débloqué',1200,250,true,false),
('nexus_first_build','Première construction Nexus',60,25,true,false),
('city_event','Événement de ville',120,35,true,true),
('daily_return','Retour quotidien',25,5,true,true)
on conflict(code) do update set label=excluded.label,xp=excluded.xp,coins=excluded.coins,active=excluded.active,repeatable=excluded.repeatable;

create or replace function public.nexus_can_place(p_city_id uuid,p_x integer,p_z integer,p_w integer,p_h integer,p_ignore uuid default null) returns boolean language sql stable security definer set search_path=public as $$
 select p_x between -500 and 500 and p_z between -500 and 500
 and (select count(*) from public.nexus_city_placements where city_id=p_city_id) < 5000
 and not exists(
   select 1 from public.nexus_city_placements p
   where p.city_id=p_city_id and (p_ignore is null or p.id<>p_ignore)
   and abs(p.x-p_x) < ((greatest(1,p.footprint_w)+greatest(1,p_w))::numeric/2 + 1)
   and abs(p.z-p_z) < ((greatest(1,p.footprint_h)+greatest(1,p_h))::numeric/2 + 1)
 );
$$;
revoke all on function public.nexus_can_place(uuid,integer,integer,integer,integer,uuid) from public;

create or replace function public.nexus_purchase_and_place_building(p_building_code text,p_x integer,p_z integer,p_rotation smallint default 0,p_request_id uuid default gen_random_uuid()) returns jsonb language plpgsql security definer set search_path=public as $$
declare v_uid uuid:=auth.uid();v_account public.economy_accounts%rowtype;v_city public.nexus_cities%rowtype;v_build public.nexus_city_buildings%rowtype;v_existing public.nexus_city_placements%rowtype;v_level integer;v_placement_id uuid;v_w integer;v_h integer;
begin
 if v_uid is null then raise exception 'authentication_required'; end if;
 if p_request_id is null then raise exception 'request_id_required'; end if;
 if mod(((p_rotation::integer%360)+360)%360,15)<>0 then raise exception 'invalid_rotation'; end if;
 select * into v_account from public.economy_accounts where user_id=v_uid for update;
 if not found then insert into public.economy_accounts(user_id,xp,coins) values(v_uid,0,0) returning * into v_account; end if;
 select * into v_city from public.nexus_cities where user_id=v_uid for update;
 if not found then raise exception 'nexus_city_required'; end if;
 select * into v_existing from public.nexus_city_placements where city_id=v_city.city_id and request_id=p_request_id;
 if found then return jsonb_build_object('ok',true,'idempotent',true,'placement_id',v_existing.id,'coins',v_account.coins,'xp',v_account.xp,'token',0,'revision',v_city.revision); end if;
 select * into v_build from public.nexus_city_buildings where code=p_building_code and active=true;
 if not found then raise exception 'unknown_building'; end if;
 v_level:=least(150,greatest(1,floor(sqrt(greatest(v_account.xp,0)::numeric/110))+1));
 if v_level<v_build.unlock_level then raise exception 'level_required'; end if;
 if v_account.coins<v_build.cost_coins then raise exception 'insufficient_coins'; end if;
 v_w:=greatest(1,coalesce((v_build.footprint->>'w')::integer,1));v_h:=greatest(1,coalesce((v_build.footprint->>'h')::integer,1));
 if not public.nexus_can_place(v_city.city_id,p_x,p_z,v_w,v_h,null) then raise exception 'placement_blocked'; end if;
 update public.economy_accounts set coins=coins-v_build.cost_coins,updated_at=now() where user_id=v_uid returning * into v_account;
 insert into public.nexus_city_placements(city_id,building_code,x,z,rotation,footprint_w,footprint_h,request_id,upgrade_level) values(v_city.city_id,v_build.code,p_x,p_z,(((p_rotation::integer%360)+360)%360)::smallint,v_w,v_h,p_request_id,1) returning id into v_placement_id;
 insert into public.nexus_city_journal(city_id,user_id,action,reference_id,coins,metadata) values(v_city.city_id,v_uid,'build_purchase',v_placement_id,-v_build.cost_coins,jsonb_build_object('building_code',v_build.code,'request_id',p_request_id,'token',0));
 insert into public.threeb_wallet_ledger(user_id,event_key,event_id,xp_delta,coins_delta) values(v_uid,'nexus_build_purchase',p_request_id::text,0,-least(v_build.cost_coins,1000000)) on conflict(user_id,event_key,event_id) do nothing;
 update public.nexus_cities set revision=revision+1,updated_at=now() where user_id=v_uid returning revision into v_city.revision;
 return jsonb_build_object('ok',true,'idempotent',false,'placement_id',v_placement_id,'coins',v_account.coins,'xp',v_account.xp,'level',v_level,'token',0,'revision',v_city.revision);
end$$;
revoke all on function public.nexus_purchase_and_place_building(text,integer,integer,smallint,uuid) from public;grant execute on function public.nexus_purchase_and_place_building(text,integer,integer,smallint,uuid) to authenticated;

create or replace function public.nexus_upgrade_building(p_placement_id uuid,p_request_id uuid) returns jsonb language plpgsql security definer set search_path=public as $$
declare v_uid uuid:=auth.uid();v_account public.economy_accounts%rowtype;v_city public.nexus_cities%rowtype;v_place public.nexus_city_placements%rowtype;v_build public.nexus_city_buildings%rowtype;v_price bigint;v_event text;
begin
 if v_uid is null then raise exception 'authentication_required'; end if;if p_request_id is null then raise exception 'request_id_required'; end if;
 v_event:='upgrade:'||p_request_id::text;
 select * into v_account from public.economy_accounts where user_id=v_uid for update;if not found then raise exception 'wallet_required';end if;
 select * into v_city from public.nexus_cities where user_id=v_uid for update;if not found then raise exception 'nexus_city_required';end if;
 if exists(select 1 from public.threeb_wallet_ledger where user_id=v_uid and event_key='nexus_build_upgrade' and event_id=p_request_id::text) then return jsonb_build_object('ok',true,'idempotent',true,'coins',v_account.coins,'xp',v_account.xp,'token',0,'revision',v_city.revision);end if;
 select * into v_place from public.nexus_city_placements where id=p_placement_id and city_id=v_city.city_id for update;if not found then raise exception 'placement_not_found';end if;
 if v_place.upgrade_level>=5 then raise exception 'max_upgrade';end if;
 select * into v_build from public.nexus_city_buildings where code=v_place.building_code and active=true;if not found then raise exception 'unknown_building';end if;
 v_price:=round(v_build.cost_coins*power(1.55,v_place.upgrade_level));if v_account.coins<v_price then raise exception 'insufficient_coins';end if;
 update public.economy_accounts set coins=coins-v_price,updated_at=now() where user_id=v_uid returning * into v_account;
 update public.nexus_city_placements set upgrade_level=upgrade_level+1 where id=p_placement_id returning * into v_place;
 insert into public.threeb_wallet_ledger(user_id,event_key,event_id,xp_delta,coins_delta) values(v_uid,'nexus_build_upgrade',p_request_id::text,0,-least(v_price,1000000));
 insert into public.nexus_city_journal(city_id,user_id,action,reference_id,coins,metadata) values(v_city.city_id,v_uid,'build_upgrade',p_placement_id,-v_price,jsonb_build_object('upgrade_level',v_place.upgrade_level,'request_id',p_request_id,'token',0));
 update public.nexus_cities set revision=revision+1,updated_at=now() where user_id=v_uid returning revision into v_city.revision;
 return jsonb_build_object('ok',true,'idempotent',false,'upgrade_level',v_place.upgrade_level,'coins',v_account.coins,'xp',v_account.xp,'token',0,'revision',v_city.revision);
end$$;
revoke all on function public.nexus_upgrade_building(uuid,uuid) from public;grant execute on function public.nexus_upgrade_building(uuid,uuid) to authenticated;

create or replace function public.nexus_remove_building(p_placement_id uuid,p_request_id uuid) returns jsonb language plpgsql security definer set search_path=public as $$
declare v_uid uuid:=auth.uid();v_account public.economy_accounts%rowtype;v_city public.nexus_cities%rowtype;v_place public.nexus_city_placements%rowtype;v_build public.nexus_city_buildings%rowtype;v_refund bigint:=0;v_i integer;
begin
 if v_uid is null then raise exception 'authentication_required';end if;if p_request_id is null then raise exception 'request_id_required';end if;
 select * into v_account from public.economy_accounts where user_id=v_uid for update;if not found then raise exception 'wallet_required';end if;
 select * into v_city from public.nexus_cities where user_id=v_uid for update;if not found then raise exception 'nexus_city_required';end if;
 if exists(select 1 from public.threeb_wallet_ledger where user_id=v_uid and event_key='nexus_build_remove' and event_id=p_request_id::text) then return jsonb_build_object('ok',true,'idempotent',true,'coins',v_account.coins,'xp',v_account.xp,'token',0,'revision',v_city.revision);end if;
 select * into v_place from public.nexus_city_placements where id=p_placement_id and city_id=v_city.city_id for update;if not found then raise exception 'placement_not_found';end if;
 select * into v_build from public.nexus_city_buildings where code=v_place.building_code;if not found then raise exception 'unknown_building';end if;
 if v_build.permanent then v_refund:=0; else v_refund:=floor(v_build.cost_coins*.5);for v_i in 1..greatest(0,v_place.upgrade_level-1) loop v_refund:=v_refund+floor(round(v_build.cost_coins*power(1.55,v_i))*.5);end loop;end if;
 delete from public.nexus_city_placements where id=p_placement_id;
 update public.economy_accounts set coins=coins+v_refund,updated_at=now() where user_id=v_uid returning * into v_account;
 insert into public.threeb_wallet_ledger(user_id,event_key,event_id,xp_delta,coins_delta) values(v_uid,'nexus_build_remove',p_request_id::text,0,least(v_refund,1000000));
 insert into public.nexus_city_journal(city_id,user_id,action,reference_id,coins,metadata) values(v_city.city_id,v_uid,'build_remove',p_placement_id,v_refund,jsonb_build_object('building_code',v_place.building_code,'upgrade_level',v_place.upgrade_level,'request_id',p_request_id,'token',0));
 update public.nexus_cities set revision=revision+1,updated_at=now() where user_id=v_uid returning revision into v_city.revision;
 return jsonb_build_object('ok',true,'refund',v_refund,'coins',v_account.coins,'xp',v_account.xp,'token',0,'revision',v_city.revision);
end$$;
revoke all on function public.nexus_remove_building(uuid,uuid) from public;grant execute on function public.nexus_remove_building(uuid,uuid) to authenticated;

create or replace function public.threeb_credit_reward_server(p_user_id uuid,p_reward_code text,p_event_id text) returns jsonb language plpgsql security definer set search_path=public as $$
declare v_reward public.reward_definitions%rowtype;v_account public.economy_accounts%rowtype;
begin
 if p_user_id is null or p_event_id is null or length(p_event_id)<3 then raise exception 'invalid_reward_request';end if;
 select * into v_reward from public.reward_definitions where code=p_reward_code and active=true;if not found then raise exception 'unknown_reward';end if;
 select * into v_account from public.economy_accounts where user_id=p_user_id for update;if not found then insert into public.economy_accounts(user_id,xp,coins) values(p_user_id,0,0) returning * into v_account;end if;
 if exists(select 1 from public.threeb_wallet_ledger where user_id=p_user_id and event_key='reward:'||p_reward_code and event_id=p_event_id) then return jsonb_build_object('ok',true,'idempotent',true,'xp',v_account.xp,'coins',v_account.coins,'token',0);end if;
 if not v_reward.repeatable and exists(select 1 from public.threeb_wallet_ledger where user_id=p_user_id and event_key='reward:'||p_reward_code) then raise exception 'reward_already_claimed';end if;
 update public.economy_accounts set xp=xp+v_reward.xp,coins=coins+v_reward.coins,updated_at=now() where user_id=p_user_id returning * into v_account;
 insert into public.threeb_wallet_ledger(user_id,event_key,event_id,xp_delta,coins_delta) values(p_user_id,'reward:'||p_reward_code,p_event_id,v_reward.xp,least(v_reward.coins,1000000));
 return jsonb_build_object('ok',true,'idempotent',false,'xp',v_account.xp,'coins',v_account.coins,'token',0);
end$$;
revoke all on function public.threeb_credit_reward_server(uuid,text,text) from public;revoke execute on function public.threeb_credit_reward_server(uuid,text,text) from anon,authenticated;
grant execute on function public.threeb_credit_reward_server(uuid,text,text) to service_role;
