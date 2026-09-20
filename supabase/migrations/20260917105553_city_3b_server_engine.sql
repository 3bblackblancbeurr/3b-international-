begin;
create or replace function public.nexus_city_create(p_user uuid,p_name text,p_country text) returns uuid language plpgsql security invoker set search_path='' as $$
declare cid uuid; clean_name text:=trim(p_name); country text:=p_country;
begin
 if p_user is null or not exists(select 1 from public.member_profiles where user_id=p_user) then raise exception 'Compte 3B introuvable'; end if;
 if length(clean_name)<2 or length(clean_name)>40 then raise exception 'Nom de ville invalide'; end if;
 if country not in ('France','Italie','Estonie','Turquie','Algérie','Tunisie','Maroc','Espagne') then raise exception 'Pays 3B invalide'; end if;
 select city_id into cid from public.nexus_cities where user_id=p_user for update;
 if cid is not null then return cid; end if;
 insert into public.nexus_cities(user_id,name,origin_country,visibility,city,save_version) values(p_user,clean_name,country,'private',jsonb_build_object('version',2,'level',1,'xp',0,'theme','origin','currency',0,'roads','[]'::jsonb,'placements','[]'::jsonb,'unlocked','[]'::jsonb),1) returning city_id into cid;
 insert into public.nexus_city_districts(city_id,country,level,unlocked,xp) select cid,c,case when c=country then 1 else 0 end,c=country,0 from unnest(array['France','Italie','Estonie','Turquie','Algérie','Tunisie','Maroc','Espagne']) c;
 insert into public.nexus_city_unlocks(city_id,building_code,source) select cid,code,'starter' from public.nexus_city_buildings where metadata->>'starter'='true' and active=true on conflict do nothing;
 return cid;
end;$$;

create or replace function public.nexus_city_place(p_user uuid,p_building text,p_x integer,p_z integer,p_rotation smallint) returns uuid language plpgsql security invoker set search_path='' as $$
declare c public.nexus_cities; b public.nexus_city_buildings; pid uuid; member_xp bigint; member_points bigint; lvl integer;
begin
 select * into c from public.nexus_cities where user_id=p_user for update;if not found then raise exception 'Crée ta ville 3B d abord'; end if;
 select * into b from public.nexus_city_buildings where code=p_building and active=true;if not found then raise exception 'Bâtiment indisponible'; end if;
 select xp,points into member_xp,member_points from public.member_profiles where user_id=p_user for update;if member_xp is null then raise exception 'Compte 3B introuvable'; end if;
 lvl=greatest(1,least(100,(member_xp/1000)::integer+1));if lvl<b.unlock_level then raise exception 'Niveau insuffisant'; end if;
 if b.country is not null and not exists(select 1 from public.nexus_city_districts where city_id=c.city_id and country=b.country and unlocked=true) then raise exception 'Quartier non débloqué'; end if;
 if not exists(select 1 from public.nexus_city_unlocks where city_id=c.city_id and building_code=b.code) then insert into public.nexus_city_unlocks(city_id,building_code,source) values(c.city_id,b.code,'level') on conflict do nothing; end if;
 if b.cost_coins>0 then if member_points<b.cost_coins then raise exception 'Coins 3B insuffisants'; end if; update public.member_profiles set points=points-b.cost_coins where user_id=p_user; insert into public.member_ledger(user_id,event_key,source,label,xp,points) values(p_user,p_user||':city:build:'||gen_random_uuid(),'city','Construction Ville 3B · '||b.name,0,-b.cost_coins::integer); end if;
 insert into public.nexus_city_placements(city_id,building_code,x,z,rotation) values(c.city_id,b.code,p_x,p_z,p_rotation) returning id into pid;update public.nexus_cities set revision=revision+1,updated_at=now() where user_id=p_user;return pid;
end;$$;

create or replace function public.nexus_city_move(p_user uuid,p_placement uuid,p_x integer,p_z integer,p_rotation smallint) returns boolean language plpgsql security invoker set search_path='' as $$
declare cid uuid;
begin select city_id into cid from public.nexus_cities where user_id=p_user for update;if cid is null then raise exception 'Ville introuvable'; end if;update public.nexus_city_placements set x=p_x,z=p_z,rotation=p_rotation where id=p_placement and city_id=cid;if not found then raise exception 'Bâtiment introuvable'; end if;update public.nexus_cities set revision=revision+1,updated_at=now() where city_id=cid;return true;end;$$;

create or replace function public.nexus_city_remove(p_user uuid,p_placement uuid) returns boolean language plpgsql security invoker set search_path='' as $$
declare cid uuid;
begin select city_id into cid from public.nexus_cities where user_id=p_user for update;if cid is null then raise exception 'Ville introuvable'; end if;delete from public.nexus_city_placements where id=p_placement and city_id=cid;if not found then raise exception 'Bâtiment introuvable'; end if;update public.nexus_cities set revision=revision+1,updated_at=now() where city_id=cid;return true;end;$$;

create or replace function public.nexus_city_display_item(p_user uuid,p_item uuid,p_x integer,p_z integer,p_rotation smallint) returns boolean language plpgsql security invoker set search_path='' as $$
declare cid uuid;
begin select city_id into cid from public.nexus_cities where user_id=p_user for update;if cid is null then raise exception 'Ville introuvable'; end if;if not exists(select 1 from public.item_instances where id=p_item and owner_id=p_user and state='owned') then raise exception 'Objet 3B non possédé'; end if;insert into public.nexus_city_collectible_displays(city_id,item_instance_id,x,z,rotation) values(cid,p_item,p_x,p_z,p_rotation) on conflict(city_id,item_instance_id) do update set x=excluded.x,z=excluded.z,rotation=excluded.rotation,displayed_at=now();update public.nexus_cities set revision=revision+1,updated_at=now() where city_id=cid;return true;end;$$;

revoke all on function public.nexus_city_create(uuid,text,text),public.nexus_city_place(uuid,text,integer,integer,smallint),public.nexus_city_move(uuid,uuid,integer,integer,smallint),public.nexus_city_remove(uuid,uuid),public.nexus_city_display_item(uuid,uuid,integer,integer,smallint) from public,anon,authenticated;
grant execute on function public.nexus_city_create(uuid,text,text),public.nexus_city_place(uuid,text,integer,integer,smallint),public.nexus_city_move(uuid,uuid,integer,integer,smallint),public.nexus_city_remove(uuid,uuid),public.nexus_city_display_item(uuid,uuid,integer,integer,smallint) to service_role;
commit;
