create or replace function public.nexus_ensure_city(p_origin_country text default 'International') returns jsonb language plpgsql security definer set search_path=public as $$
declare v_uid uuid:=auth.uid();v_city public.nexus_cities%rowtype;v_country text;
begin
 if v_uid is null then raise exception 'authentication_required';end if;
 v_country:=case lower(coalesce(p_origin_country,'international')) when 'france' then 'France' when 'italie' then 'Italie' when 'estonie' then 'Estonie' when 'turquie' then 'Turquie' when 'algérie' then 'Algérie' when 'algerie' then 'Algérie' when 'tunisie' then 'Tunisie' when 'maroc' then 'Maroc' when 'espagne' then 'Espagne' else 'International' end;
 insert into public.economy_accounts(user_id,xp,coins) values(v_uid,0,0) on conflict(user_id) do nothing;
 select * into v_city from public.nexus_cities where user_id=v_uid;
 if not found then insert into public.nexus_cities(user_id,name,origin_country,visibility) values(v_uid,'Ma ville 3B',v_country,'private') returning * into v_city;end if;
 return jsonb_build_object('ok',true,'city_id',v_city.city_id,'revision',v_city.revision,'name',v_city.name,'origin_country',v_city.origin_country,'visibility',v_city.visibility,'city_level',v_city.city_level,'city_xp',v_city.city_xp);
end$$;
revoke all on function public.nexus_ensure_city(text) from public;grant execute on function public.nexus_ensure_city(text) to authenticated;

create or replace function public.nexus_set_city_preferences(p_name text,p_visibility text,p_day_mode text,p_weather text,p_ambience text,p_expected_revision bigint) returns jsonb language plpgsql security definer set search_path=public as $$
declare v_uid uuid:=auth.uid();v_city public.nexus_cities%rowtype;
begin
 if v_uid is null then raise exception 'authentication_required';end if;
 if length(trim(coalesce(p_name,'')))<2 or length(trim(p_name))>60 then raise exception 'invalid_name';end if;
 if p_visibility not in ('private','unlisted','public') then raise exception 'invalid_visibility';end if;
 if p_day_mode not in ('auto','day','sunset','night') then raise exception 'invalid_day_mode';end if;
 if p_weather not in ('clear','clouds','rain','mist','snow') then raise exception 'invalid_weather';end if;
 if p_ambience not in ('calm','city','matrix','heritage','festival') then raise exception 'invalid_ambience';end if;
 select * into v_city from public.nexus_cities where user_id=v_uid for update;if not found then raise exception 'nexus_city_required';end if;
 if v_city.revision<>p_expected_revision then raise exception 'revision_conflict';end if;
 update public.nexus_cities set name=trim(p_name),visibility=p_visibility,day_mode=p_day_mode,weather=p_weather,ambience=p_ambience,revision=revision+1,updated_at=now() where user_id=v_uid returning * into v_city;
 return jsonb_build_object('ok',true,'revision',v_city.revision,'name',v_city.name,'visibility',v_city.visibility,'day_mode',v_city.day_mode,'weather',v_city.weather,'ambience',v_city.ambience);
end$$;
revoke all on function public.nexus_set_city_preferences(text,text,text,text,text,bigint) from public;grant execute on function public.nexus_set_city_preferences(text,text,text,text,text,bigint) to authenticated;

create or replace function public.nexus_move_building(p_placement_id uuid,p_x integer,p_z integer,p_rotation smallint,p_expected_revision bigint,p_request_id uuid) returns jsonb language plpgsql security definer set search_path=public as $$
declare v_uid uuid:=auth.uid();v_city public.nexus_cities%rowtype;v_place public.nexus_city_placements%rowtype;
begin
 if v_uid is null then raise exception 'authentication_required';end if;if p_request_id is null then raise exception 'request_id_required';end if;
 if mod(((p_rotation::integer%360)+360)%360,15)<>0 then raise exception 'invalid_rotation';end if;
 select * into v_city from public.nexus_cities where user_id=v_uid for update;if not found then raise exception 'nexus_city_required';end if;
 if v_city.revision<>p_expected_revision then raise exception 'revision_conflict';end if;
 if exists(select 1 from public.threeb_wallet_ledger where user_id=v_uid and event_key='nexus_build_move' and event_id=p_request_id::text) then return jsonb_build_object('ok',true,'idempotent',true,'revision',v_city.revision,'token',0);end if;
 select * into v_place from public.nexus_city_placements where id=p_placement_id and city_id=v_city.city_id for update;if not found then raise exception 'placement_not_found';end if;
 if not public.nexus_can_place(v_city.city_id,p_x,p_z,v_place.footprint_w,v_place.footprint_h,p_placement_id) then raise exception 'placement_blocked';end if;
 update public.nexus_city_placements set x=p_x,z=p_z,rotation=(((p_rotation::integer%360)+360)%360)::smallint where id=p_placement_id;
 insert into public.threeb_wallet_ledger(user_id,event_key,event_id,xp_delta,coins_delta) values(v_uid,'nexus_build_move',p_request_id::text,0,0);
 insert into public.nexus_city_journal(city_id,user_id,action,reference_id,coins,metadata) values(v_city.city_id,v_uid,'build_move',p_placement_id,0,jsonb_build_object('x',p_x,'z',p_z,'rotation',p_rotation,'request_id',p_request_id,'token',0));
 update public.nexus_cities set revision=revision+1,updated_at=now() where user_id=v_uid returning revision into v_city.revision;
 return jsonb_build_object('ok',true,'idempotent',false,'revision',v_city.revision,'placement_id',p_placement_id,'x',p_x,'z',p_z,'rotation',p_rotation,'token',0);
end$$;
revoke all on function public.nexus_move_building(uuid,integer,integer,smallint,bigint,uuid) from public;grant execute on function public.nexus_move_building(uuid,integer,integer,smallint,bigint,uuid) to authenticated;

revoke all on public.nexus_cities from anon;
revoke all on public.nexus_cities from authenticated;
grant select on public.nexus_cities to authenticated;
revoke all on public.threeb_wallet_ledger from anon;
revoke all on public.threeb_wallet_ledger from authenticated;
grant select on public.threeb_wallet_ledger to authenticated;
