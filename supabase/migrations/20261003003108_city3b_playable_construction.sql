begin;

-- New neighbourhood buildings use proper construction parcels. Existing saved footprints are untouched.
insert into public.nexus_city_buildings(code,name,category,unlock_level,cost_coins,footprint,metadata) values
('LAKE_HOMES_3B','Résidence du Lac','home',2,180,'{"w":4,"h":4}','{"city_role":"housing","style":"limestone"}'),
('BAKERY_3B','Boulangerie du quartier','shop',2,180,'{"w":3,"h":3}','{"city_role":"commerce","service":"food"}'),
('MARKET_3B','Marché des habitants','shop',3,260,'{"w":5,"h":4}','{"city_role":"commerce","service":"food"}'),
('GARDEN_3B','Jardin public','nature',2,150,'{"w":4,"h":4}','{"city_role":"green"}'),
('SQUARE_3B','Place des rencontres','nature',3,220,'{"w":5,"h":5}','{"city_role":"green"}'),
('LAKE_SCHOOL_3B','École du Lac','community',3,320,'{"w":5,"h":4}','{"city_role":"civic","service":"education"}'),
('HEALTH_CENTER_3B','Centre de soins','community',4,360,'{"w":4,"h":4}','{"city_role":"civic","service":"health"}'),
('TRAM_STATION_3B','Gare du tram','road',4,400,'{"w":5,"h":3}','{"city_role":"mobility","service":"transit"}'),
('LAKE_CAFE_3B','Terrasse du Lac','shop',3,240,'{"w":3,"h":4}','{"city_role":"commerce","service":"meeting"}'),
('CRAFT_HOUSE_3B','Maison des artisans','culture',3,280,'{"w":4,"h":4}','{"city_role":"mixed","service":"culture"}'),
('PLAYGROUND_3B','Terrain multisport','sport',4,360,'{"w":5,"h":5}','{"city_role":"civic","service":"sport"}'),
('HARBOR_3B','Maison du port','road',5,450,'{"w":5,"h":4}','{"city_role":"mobility","service":"transit"}')
on conflict(code) do nothing;

-- A build request must obey the same reserved coast, districts and axes as the visible map.
create function public.city3b_validate_parcel() returns trigger language plpgsql security invoker set search_path='' as $$
declare c public.nexus_cities; half numeric;px numeric;pz numeric;fr numeric;r jsonb;d record;radius numeric;
begin
 if new.placement_state='stored' then return new;end if;
 if tg_op='UPDATE' and old.placement_state='placed' and (new.x,new.z,new.rotation,new.footprint_w,new.footprint_h) is not distinct from (old.x,old.z,old.rotation,old.footprint_w,old.footprint_h) then return new;end if;
 select * into c from public.nexus_cities where city_id=new.city_id for update;
 half:=50+greatest(1,least(10,c.land_tier))*45;
 if new.x < -half or new.z < -half or new.x+new.footprint_w-1>half or new.z+new.footprint_h-1>half then raise exception 'Hors du terrain';end if;
 if new.z+new.footprint_h-1>=half*.91-1 then raise exception 'Zone d’eau réservée';end if;
 px:=new.x+new.footprint_w/2.0;pz:=new.z+new.footprint_h/2.0;
 fr:=greatest(1.2,least(8,sqrt(new.footprint_w^2+new.footprint_h^2)*.26));
 for d in select v.*,coalesce(t.unlocked,false) unlocked from (values
 ('France',0::numeric,-.66::numeric),('Algérie',.48,-.47),('Espagne',.68,0),('Maroc',.48,.47),('Italie',0,.66),('Tunisie',-.48,.47),('Turquie',-.68,0),('Estonie',-.48,-.47)) v(country,ux,uz)
 left join public.nexus_city_districts t on t.city_id=c.city_id and t.country=v.country loop
  if not d.unlocked and power((px-d.ux*half*.72)/greatest(18,half*.18),2)+power((pz-d.uz*half*.72)/greatest(15,half*.15),2)<=1 then raise exception 'Quartier % verrouillé',d.country;end if;
  if d.unlocked and public.nexus_city_life_road_distance(px,pz,jsonb_build_object('x1',0,'z1',0,'x2',d.ux*half*.72,'z2',d.uz*half*.72))<2.3+fr then raise exception 'Axe routier réservé';end if;
 end loop;
 foreach radius in array array[half*.24,half*.47,half*.72] loop
  if abs(sqrt(px*px+pz*pz)-radius)<(case when radius=half*.47 then 2.6 else 1.8 end)+fr then raise exception 'Anneau routier réservé';end if;
 end loop;
 for r in select * from jsonb_array_elements(coalesce(c.city->'roads','[]'::jsonb)||jsonb_build_array(jsonb_build_object('x1',-half*.82,'z1',0,'x2',half*.82,'z2',0,'width',5.2),jsonb_build_object('x1',0,'z1',-half*.82,'x2',0,'z2',half*.82,'width',5.2))) loop
  if public.nexus_city_life_road_distance(px,pz,r)<coalesce((r->>'width')::numeric,4)/2+fr then raise exception 'Axe routier réservé';end if;
 end loop;
 return new;
end $$;
revoke all on function public.city3b_validate_parcel() from public,anon,authenticated;
grant execute on function public.city3b_validate_parcel() to service_role;
create trigger city3b_parcel_guard before insert or update of x,z,rotation,footprint_w,footprint_h,placement_state on public.nexus_city_placements for each row execute function public.city3b_validate_parcel();

-- Reject a newly drawn road through an occupied parcel; never erase buildings to draw a road.
create function public.city3b_validate_roads() returns trigger language plpgsql security invoker set search_path='' as $$
declare r jsonb;b record;
begin
 if coalesce(new.city->'roads','[]'::jsonb) is not distinct from coalesce(old.city->'roads','[]'::jsonb) then return new;end if;
 for r in select value from jsonb_array_elements(coalesce(new.city->'roads','[]'::jsonb)) loop
  if exists(select 1 from jsonb_array_elements(coalesce(old.city->'roads','[]'::jsonb)) p where p.value=r) then continue;end if;
  for b in select * from public.nexus_city_placements where city_id=new.city_id and placement_state='placed' loop
   if public.nexus_city_life_road_distance(b.x+b.footprint_w/2.0,b.z+b.footprint_h/2.0,r)<coalesce((r->>'width')::numeric,4)/2+greatest(1.2,least(8,sqrt(b.footprint_w^2+b.footprint_h^2)*.26)) then raise exception 'Cette route traverse un bâtiment. Déplace-le ou choisis un autre tracé.';end if;
  end loop;
 end loop;
 return new;
end $$;
revoke all on function public.city3b_validate_roads() from public,anon,authenticated;
grant execute on function public.city3b_validate_roads() to service_role;
create trigger city3b_road_guard before update of city on public.nexus_cities for each row execute function public.city3b_validate_roads();

-- Repeatable income is calculated server-side, capped, and collectible once per UTC day.
-- It creates only game Coins, never euros. No income multiplication for Premium owners.
create function public.nexus_city_budget_snapshot(p_user uuid) returns jsonb language plpgsql security invoker set search_path='' as $$
declare life jsonb;amount integer;claimed boolean;day_key text:=to_char(now() at time zone 'UTC','YYYY-MM-DD');
begin
 life:=public.nexus_city_life_snapshot(p_user);
 amount:=case when coalesce((life->>'population')::integer,0)>0 then least(300,greatest(5,floor(coalesce((life->>'employed')::numeric,0)*.6+coalesce((life->>'happiness')::numeric,0)*.25)::integer)) else 0 end;
 select exists(select 1 from public.threeb_wallet_ledger where user_id=p_user and event_key='city_income' and event_id=day_key) into claimed;
 return jsonb_build_object('available',true,'amount',amount,'claimed',claimed,'day',day_key,'nextAt',date_trunc('day',now() at time zone 'UTC')+interval '1 day','maxPerDay',300);
end $$;
create function public.nexus_city_budget_claim(p_user uuid) returns jsonb language plpgsql security invoker set search_path='' as $$
declare budget jsonb;amount integer;ledger_id bigint;cid uuid;
begin
 perform pg_advisory_xact_lock(hashtextextended(p_user::text,0));
 select city_id into cid from public.nexus_cities where user_id=p_user for update;
 perform 1 from public.economy_accounts where user_id=p_user for update;
 perform 1 from public.member_profiles where user_id=p_user for update;
 if not exists(select 1 from public.member_profiles where user_id=p_user and passport_state='active') then raise exception 'Passeport 3B actif requis';end if;
 select city_id into cid from public.nexus_cities where user_id=p_user for update;
 if cid is null then raise exception 'Ville introuvable';end if;
 budget:=public.nexus_city_budget_snapshot(p_user);amount:=(budget->>'amount')::integer;
 if (budget->>'claimed')::boolean then return jsonb_build_object('alreadyClaimed',true,'coins',0,'cityXp',0,'income',true);end if;
 if amount<=0 then raise exception 'Accueille des habitants pour percevoir les recettes de la ville';end if;
 insert into public.threeb_wallet_ledger(user_id,event_key,event_id,xp_delta,coins_delta) values(p_user,'city_income',budget->>'day',0,amount) on conflict(user_id,event_key,event_id) do nothing returning id into ledger_id;
 if ledger_id is null then return jsonb_build_object('alreadyClaimed',true,'coins',0,'cityXp',0,'income',true);end if;
 insert into public.economy_transactions(user_id,asset,amount,kind,source,idempotency_key,metadata) values(p_user,'coins',amount,'earn','city_income',p_user::text||':city_income:'||(budget->>'day'),jsonb_build_object('city',cid));
 perform public.threeb_wallet_apply_server(p_user,0,amount);
 insert into public.nexus_city_journal(city_id,user_id,action,coins,metadata) values(cid,p_user,'city_income',amount,jsonb_build_object('day',budget->>'day'));
 return jsonb_build_object('alreadyClaimed',false,'coins',amount,'cityXp',0,'income',true);
end $$;
revoke all on function public.nexus_city_budget_snapshot(uuid),public.nexus_city_budget_claim(uuid) from public,anon,authenticated;
grant execute on function public.nexus_city_budget_snapshot(uuid),public.nexus_city_budget_claim(uuid) to service_role;
-- Moving or restoring a legacy building preserves the footprint actually purchased.
create or replace function public.nexus_city_move_v2(p_user uuid,p_placement uuid,p_x integer,p_z integer,p_rotation smallint,p_request uuid)
returns uuid
language plpgsql
security invoker
set search_path=''
as $$
declare
 c public.nexus_cities;
 p public.nexus_city_placements;
 b public.nexus_city_buildings;
 fw integer;
 fh integer;
 half integer;
 was_state text;
begin
 if p_request is null then raise exception 'Identifiant de déplacement requis'; end if;
 if p_rotation not in (0,90,180,270) then raise exception 'Rotation invalide'; end if;
 select * into c from public.nexus_cities where user_id=p_user for update;
 if not found then raise exception 'Ville introuvable'; end if;
 select * into p from public.nexus_city_placements where id=p_placement and city_id=c.city_id for update;
 if not found then raise exception 'Bâtiment introuvable'; end if;
 if p.mutation_request_id=p_request then return p.id; end if;
 select * into b from public.nexus_city_buildings where code=p.building_code and active=true;
 if not found then raise exception 'Bâtiment indisponible'; end if;
 fw=greatest(1,p.footprint_w);
 fh=greatest(1,p.footprint_h);
 if (p_rotation in (90,270)) <> (p.rotation in (90,270)) then select fh,fw into fw,fh;end if;
 half=50+c.land_tier*45;
 if p_x< -half or p_z< -half or p_x+fw-1>half or p_z+fh-1>half then raise exception 'Construction hors du terrain'; end if;
 if exists(
   select 1 from public.nexus_city_placements q
   where q.city_id=c.city_id and q.id<>p.id and q.placement_state='placed'
     and p_x<=q.x+q.footprint_w-1 and p_x+fw-1>=q.x
     and p_z<=q.z+q.footprint_h-1 and p_z+fh-1>=q.z
 ) then raise exception 'Cette parcelle est déjà occupée'; end if;
 was_state=p.placement_state;
 update public.nexus_city_placements
 set x=p_x,z=p_z,rotation=p_rotation,footprint_w=fw,footprint_h=fh,
     placement_state='placed',stored_at=null,mutation_request_id=p_request
 where id=p.id;
 insert into public.nexus_city_journal(city_id,user_id,action,reference_id,coins,metadata)
 values(c.city_id,p_user,case when was_state='stored' then 'restore' else 'move' end,p.id,0,
   jsonb_build_object('x',p_x,'z',p_z,'rotation',p_rotation));
 update public.nexus_cities set revision=revision+1,updated_at=now() where city_id=c.city_id;
 return p.id;
end $$;

commit;
