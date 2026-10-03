begin;

-- Expand the real buildable terrain to 1000 x 1000 units. Keep the previous civic/road layout fixed.
update public.nexus_cities set city=coalesce(city,'{}'::jsonb)||jsonb_build_object('map_extent',500,'core_half',50+greatest(1,least(10,land_tier))*45);
create function public.city3b_large_map_defaults() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 new.city:=coalesce(new.city,'{}'::jsonb)||jsonb_build_object('map_extent',500,'core_half',95);
 return new;
end $$;
revoke all on function public.city3b_large_map_defaults() from public,anon,authenticated;
grant execute on function public.city3b_large_map_defaults() to service_role;
create trigger city3b_large_map_default before insert on public.nexus_cities for each row execute function public.city3b_large_map_defaults();

-- Preserve the current wallet, idempotency and security implementation while changing only spatial limits.
do $map$
declare body text; original text; name text;
begin
 foreach name in array array['nexus_city_place_v2(uuid,text,integer,integer,smallint,uuid)','nexus_city_move_v2(uuid,uuid,integer,integer,smallint,uuid)'] loop
  original:=pg_get_functiondef(('public.'||name)::regprocedure);
  if position('half=50+c.land_tier*45;' in original)=0 then raise exception 'Unexpected spatial function: %',name;end if;
  body:=replace(original,'half=50+c.land_tier*45;','half=500;');
  body:=replace(body,'count_build>=least(500,50+c.land_tier*45)','count_build>=500');
  execute body;
 end loop;
 original:=pg_get_functiondef('public.nexus_city_plan_roads(uuid,jsonb)'::regprocedure);
 if position('half:=50+greatest(1,least(10,c.land_tier))*45;' in original)=0 then raise exception 'Unexpected roads function';end if;
 body:=replace(original,'half:=50+greatest(1,least(10,c.land_tier))*45;','half:=500;');
 body:=replace(body,'jsonb_array_length(p_roads)>64','jsonb_array_length(p_roads)>256');
 execute body;
end $map$;

create or replace function public.city3b_validate_parcel() returns trigger language plpgsql security invoker set search_path='' as $$
declare c public.nexus_cities; half numeric;core numeric;px numeric;pz numeric;fr numeric;r jsonb;d record;radius numeric;
begin
 if new.placement_state='stored' then return new;end if;
 if tg_op='UPDATE' and old.placement_state='placed' and (new.x,new.z,new.rotation,new.footprint_w,new.footprint_h) is not distinct from (old.x,old.z,old.rotation,old.footprint_w,old.footprint_h) then return new;end if;
 select * into c from public.nexus_cities where city_id=new.city_id for update;
 half:=500;core:=greatest(95,least(500,coalesce((c.city->>'core_half')::numeric,95)));
 if new.x < -half or new.z < -half or new.x+new.footprint_w-1>half or new.z+new.footprint_h-1>half then raise exception 'Hors du terrain';end if;
 if new.z+new.footprint_h-1>=half*.91-1 then raise exception 'Zone d’eau réservée';end if;
 px:=new.x+new.footprint_w/2.0;pz:=new.z+new.footprint_h/2.0;
 fr:=greatest(1.2,least(8,sqrt(new.footprint_w^2+new.footprint_h^2)*.26));
 for d in select v.*,coalesce(t.unlocked,false) unlocked from (values
 ('France',0::numeric,-.66::numeric),('Algérie',.48,-.47),('Espagne',.68,0),('Maroc',.48,.47),('Italie',0,.66),('Tunisie',-.48,.47),('Turquie',-.68,0),('Estonie',-.48,-.47)) v(country,ux,uz)
 left join public.nexus_city_districts t on t.city_id=c.city_id and t.country=v.country loop
  if not d.unlocked and power((px-d.ux*core*.72)/greatest(18,core*.18),2)+power((pz-d.uz*core*.72)/greatest(15,core*.15),2)<=1 then raise exception 'Quartier % verrouillé',d.country;end if;
  if d.unlocked and public.nexus_city_life_road_distance(px,pz,jsonb_build_object('x1',0,'z1',0,'x2',d.ux*core*.72,'z2',d.uz*core*.72))<2.3+fr then raise exception 'Axe routier réservé';end if;
 end loop;
 foreach radius in array array[core*.24,core*.47,core*.72] loop
  if abs(sqrt(px*px+pz*pz)-radius)<(case when radius=core*.47 then 2.6 else 1.8 end)+fr then raise exception 'Anneau routier réservé';end if;
 end loop;
 for r in select * from jsonb_array_elements(coalesce(c.city->'roads','[]'::jsonb)||jsonb_build_array(jsonb_build_object('x1',-core*.82,'z1',0,'x2',core*.82,'z2',0,'width',5.2),jsonb_build_object('x1',0,'z1',-core*.82,'x2',0,'z2',core*.82,'width',5.2))) loop
  if public.nexus_city_life_road_distance(px,pz,r)<coalesce((r->>'width')::numeric,4)/2+fr then raise exception 'Axe routier réservé';end if;
 end loop;
 return new;
end $$;

-- Human-scale starter parcels. Purchased placements retain their saved footprint.
update public.nexus_city_buildings set footprint=case code
 when 'HOME_ORIGIN' then '{"w":3,"h":3}'::jsonb
 when 'CITY_HALL_3B' then '{"w":5,"h":4}'::jsonb
 when 'SHOP_3B' then '{"w":4,"h":3}'::jsonb
 when 'PARK_UNITY' then '{"w":4,"h":4}'::jsonb
 else footprint end where code in ('HOME_ORIGIN','CITY_HALL_3B','SHOP_3B','PARK_UNITY');

-- Existing cities stay intact. Only future placements become timed construction sites.
alter table public.nexus_city_placements
 add column construction_started_at timestamptz,
 add column construction_ready_at timestamptz,
 add column construction_claimed_at timestamptz,
 add column construction_bonus_coins integer not null default 0 check(construction_bonus_coins between 0 and 15),
 add column construction_bonus_xp integer not null default 0 check(construction_bonus_xp between 0 and 25),
 add constraint city_construction_time_order check(construction_ready_at is null or (construction_started_at is not null and construction_ready_at>construction_started_at));

create function public.city3b_start_construction() returns trigger
language plpgsql security invoker set search_path='' as $$
declare cost integer; seconds integer;
begin
 select greatest(0,cost_coins) into cost from public.nexus_city_buildings where code=new.building_code;
 -- 18–60 seconds: the first building is visible quickly, no paid speed-up.
 seconds:=least(60,18+floor(sqrt(coalesce(cost,0))*2)::integer);
 new.construction_started_at:=now();
 new.construction_ready_at:=now()+make_interval(secs=>seconds);
 new.construction_claimed_at:=null;
 new.construction_bonus_coins:=least(15,floor(coalesce(cost,0)*.05)::integer);
 new.construction_bonus_xp:=25;
 return new;
end $$;
revoke all on function public.city3b_start_construction() from public,anon,authenticated;
grant execute on function public.city3b_start_construction() to service_role;
create trigger city3b_construction_start before insert on public.nexus_city_placements
 for each row execute function public.city3b_start_construction();

create or replace function public.nexus_city_campaign_metrics(p_user uuid)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare c public.nexus_cities; result jsonb; exact_counts jsonb; road_count integer;
begin
 select * into c from public.nexus_cities where user_id=p_user;
 if not found then raise exception 'Ville introuvable'; end if;
 select jsonb_build_object(
  'buildings',count(*),'variety',count(distinct b.code),
  'housing',count(*) filter(where b.category='home'),
  'commerce',count(*) filter(where b.category='shop'),
  'green',count(*) filter(where b.category='nature'),
  'civic',count(*) filter(where b.category='community'),
  'culture',count(*) filter(where b.category='culture'),
  'sport',count(*) filter(where b.category='sport'),
  'landmark',count(*) filter(where b.category='monument'),
  'mobility',count(*) filter(where b.metadata->>'city_role'='mobility' or b.code='GARAGE_3B')
 ) into result
 from public.nexus_city_placements p join public.nexus_city_buildings b on b.code=p.building_code
 where p.city_id=c.city_id and coalesce(p.placement_state,'placed')='placed' and (p.construction_ready_at is null or p.construction_ready_at<=now());
 select coalesce(jsonb_object_agg('building:'||code,n),'{}'::jsonb) into exact_counts from (
  select p.building_code code,count(*) n from public.nexus_city_placements p
  where p.city_id=c.city_id and coalesce(p.placement_state,'placed')='placed' and (p.construction_ready_at is null or p.construction_ready_at<=now()) group by p.building_code
 ) counts;
 with segments as (
  select (r->>'x1')::numeric x1,(r->>'z1')::numeric z1,(r->>'x2')::numeric x2,(r->>'z2')::numeric z2
  from jsonb_array_elements(case when jsonb_typeof(c.city->'roads')='array' then c.city->'roads' else '[]'::jsonb end) r
  where jsonb_typeof(r->'x1')='number' and jsonb_typeof(r->'z1')='number' and jsonb_typeof(r->'x2')='number' and jsonb_typeof(r->'z2')='number'
 ), valid as (
  select least(x1::integer::text||','||z1::integer::text,x2::integer::text||','||z2::integer::text)||'/'||greatest(x1::integer::text||','||z1::integer::text,x2::integer::text||','||z2::integer::text) signature
  from segments where power(x2-x1,2)+power(z2-z1,2)>=36
   and greatest(abs(x1),abs(x2),abs(z1),abs(z2))<=500
 ) select least(64,count(distinct signature)) into road_count from valid;
 return result||exact_counts||jsonb_build_object(
  'roads',road_count,
  'displays',(select count(*) from public.nexus_city_collectible_displays where city_id=c.city_id),
  'districts',(select count(*) from public.nexus_city_districts where city_id=c.city_id and unlocked),
  'visitors',(select count(distinct visitor_id) from public.nexus_city_visits where city_id=c.city_id and visitor_id<>p_user),
  'moves',(select count(*) from public.nexus_city_journal where city_id=c.city_id and user_id=p_user and action='move'),
  'environment_changes',(select count(*) from public.nexus_city_journal where city_id=c.city_id and user_id=p_user and action='environment'),
  'public',case when c.visibility='public' then 1 else 0 end
 );
end $$;

create or replace function public.nexus_city_life_metrics(p_user uuid,p_population integer,p_policy text)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare c public.nexus_cities; m jsonb; capacity integer:=0; jobs integer:=0; connected integer:=0; total integer:=0;
 water integer:=0; energy integer:=0; health integer:=0; education integer:=0; food integer:=0; green integer:=0; culture integer:=0; transit integer:=0;
 b record; role text; half numeric; px numeric; pz numeric; close_road boolean; working integer; employed integer; mobility integer; happiness integer; needs jsonb:='[]'::jsonb; n record; score integer; demand integer;
begin
 select * into c from public.nexus_cities where user_id=p_user;
 if not found then raise exception 'Ville introuvable'; end if;
 m:=public.nexus_city_campaign_metrics(p_user); half:=greatest(95,least(500,coalesce((c.city->>'core_half')::numeric,95)));
 for b in select p.*,d.category,d.metadata from public.nexus_city_placements p join public.nexus_city_buildings d on d.code=p.building_code
  where p.city_id=c.city_id and coalesce(p.placement_state,'placed')='placed' and (p.construction_ready_at is null or p.construction_ready_at<=now()) loop
  role:=coalesce(b.metadata->>'city_role',case b.category when 'home' then 'housing' when 'shop' then 'commerce' when 'community' then 'civic' when 'nature' then 'green' when 'culture' then 'mixed' when 'monument' then 'landmark' else 'decoration' end);
  total:=total+1; px:=b.x+coalesce(b.footprint_w,1)/2.0;pz:=b.z+coalesce(b.footprint_h,1)/2.0;
  close_road:=(abs(px)<=14 and abs(pz)<=half*.82+14) or (abs(pz)<=14 and abs(px)<=half*.82+14)
   or abs(sqrt(px*px+pz*pz)-half*.24)<=14 or abs(sqrt(px*px+pz*pz)-half*.47)<=14 or abs(sqrt(px*px+pz*pz)-half*.72)<=14;
  if not close_road then
   select exists(select 1 from jsonb_array_elements(case when jsonb_typeof(c.city->'roads')='array' then c.city->'roads' else '[]'::jsonb end) r where public.nexus_city_life_road_distance(px,pz,r)<=14) into close_road;
  end if;
  if close_road then connected:=connected+1; end if;
  capacity:=capacity+case role when 'housing' then 18 else 0 end;
  jobs:=jobs+case role when 'commerce' then 12 when 'civic' then 6 when 'mobility' then 6 when 'mixed' then 8 else 0 end;
  water:=water+case when b.metadata->>'service'='water' then 60 else 0 end;
  energy:=energy+case when b.metadata->>'service'='energy' then 60 else 0 end;
  health:=health+case when b.metadata->>'service'='health' then 40 else 0 end;
  education:=education+case when b.metadata->>'service'='education' then 30 else 0 end;
  food:=food+case when role='commerce' then 40 else 0 end;
  green:=green+case when role='green' then 24 else 0 end;
  culture:=culture+case when b.category='culture' then 30 else 0 end;
  transit:=transit+case when role='mobility' then 1 else 0 end;
 end loop;
 working:=ceil(greatest(0,p_population)*.6); employed:=least(working,jobs);
 mobility:=case when total=0 then 0 else least(100,round(connected::numeric/total*50)::integer+least(30,transit*15)+least(20,(m->>'roads')::integer*4)) end;
 for n in select * from (values ('water','Eau',water,1.0),('energy','Énergie',energy,1.0),('food','Commerces',food,1.0),('health','Soins',health,.6),('education','Éducation',education,.35),('green','Espaces verts',green,.8),('culture','Culture',culture,.5)) as v(code,label,capacity,factor) loop
  demand:=ceil(greatest(0,p_population)*n.factor);score:=case when demand=0 then 0 else least(100,round(n.capacity::numeric/demand*100)::integer) end;
  if p_policy='green' and n.code='green' and n.capacity>0 then score:=least(100,score+10);end if;
  if p_policy='culture' and n.code='culture' and n.capacity>0 then score:=least(100,score+10);end if;
  needs:=needs||jsonb_build_array(jsonb_build_object('code',n.code,'label',n.label,'score',score,'capacity',n.capacity,'demand',demand));
  m:=m||jsonb_build_object(n.code,case when n.code in ('culture','green') then coalesce((m->>n.code)::integer,0) else score end,n.code||'_score',score);
 end loop;
 select case when p_population=0 then 0 else least(100,round(25+coalesce(avg((r->>'score')::integer),0)*.55+mobility*.1+case when working=0 then 0 else employed::numeric/working*10 end+case when p_policy='balanced' then 5 else 0 end)::integer) end into happiness from jsonb_array_elements(needs) r;
 return m||jsonb_build_object('housingCapacity',capacity,'jobs',jobs,'workingPopulation',working,'employed',employed,'employment',case when working=0 then 0 else round(employed::numeric/working*100)::integer end,
  'population',greatest(0,p_population),'mobility',mobility,'connectedBuildings',connected,'placedBuildings',total,'happiness',happiness,'needs',needs);
end $$;

create or replace function public.nexus_city_life_snapshot(p_user uuid)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare c public.nexus_cities;l public.nexus_city_life;m jsonb;cycles integer;growth integer;cap integer;e record;d jsonb;requirements jsonb;ready boolean;claimed integer;rows jsonb:='[]'::jsonb;active jsonb:=null;inhabitants jsonb:='[]'::jsonb;homes uuid[];works uuid[];parks uuid[];shops uuid[];cultures uuid[];i integer;sample integer;person integer;home uuid;work uuid;target uuid;activity text;names text[]:=array['Lina','Sami','Nora','Aïcha','Élio','Inès','Maël','Amira','Adam','Mina','Yanis','Leïla','Noé','Sara','Ali','Jade','Ilyes','Sofia','Milo','Derya','Eliise','Luca','Alba','Rayan'];
begin
 select * into c from public.nexus_cities where user_id=p_user for update;
 if not found then raise exception 'Ville introuvable';end if;
 insert into public.nexus_city_life(city_id) values(c.city_id) on conflict do nothing;
 select * into l from public.nexus_city_life where city_id=c.city_id for update;
 cycles:=least(12,greatest(0,floor(extract(epoch from (now()-l.last_tick))/30)::integer));
 m:=public.nexus_city_life_metrics(p_user,l.population,l.policy);cap:=least(200000,(m->>'housingCapacity')::integer);
 -- Removing housing changes current capacity immediately. Returning offline never removes residents otherwise.
 l.population:=least(l.population,cap);
 for i in 1..cycles loop
  growth:=case when l.population>=cap then 0 else greatest(1,least(12,ceil(cap*.08)::integer+case when l.policy='industry' then 1 else 0 end)) end;
  l.population:=least(cap,l.population+growth);l.day:=l.day+1;
  m:=public.nexus_city_life_metrics(p_user,l.population,l.policy);
  for e in select * from public.nexus_city_life_events where city_id=c.city_id and state='active' for update loop
   select v into d from jsonb_array_elements(public.nexus_city_life_event_catalog()) v where v->>'code'=e.code;
   select bool_and(coalesce((m->>(g->>'metric'))::integer,0)>=(g->>'target')::integer) into ready from jsonb_array_elements(d->'requirements') g;
   update public.nexus_city_life_events set held_cycles=case when ready then least((d->>'cycles')::integer,held_cycles+1) else 0 end where city_id=c.city_id and code=e.code;
  end loop;
  l.history:=(select coalesce(jsonb_agg(v order by ord),'[]'::jsonb) from jsonb_array_elements(l.history||jsonb_build_array(jsonb_build_object('day',l.day,'population',l.population,'happiness',(m->>'happiness')::integer,'employed',(m->>'employed')::integer))) with ordinality t(v,ord) where ord>greatest(0,jsonb_array_length(l.history)+1-12));
 end loop;
 if cycles>0 then l.last_tick:=now(); end if;
 update public.nexus_city_life set day=l.day,population=l.population,last_tick=l.last_tick,history=l.history,updated_at=now() where city_id=c.city_id;
 m:=public.nexus_city_life_metrics(p_user,l.population,l.policy);
 select count(*) into claimed from public.nexus_city_life_events where city_id=c.city_id and state='claimed';
 for d in select v from jsonb_array_elements(public.nexus_city_life_event_catalog()) v loop
  select * into e from public.nexus_city_life_events where city_id=c.city_id and code=d->>'code';
  select jsonb_agg(g||jsonb_build_object('current',coalesce((m->>(g->>'metric'))::integer,0))),bool_and(coalesce((m->>(g->>'metric'))::integer,0)>=(g->>'target')::integer) into requirements,ready from jsonb_array_elements(d->'requirements') g;
  d:=d||jsonb_build_object('requirements',requirements,'heldCycles',coalesce(e.held_cycles,0),'status',case when e.state='claimed' then 'claimed' when e.state='active' and ready and e.held_cycles>=(d->>'cycles')::integer then 'ready' when e.state='active' then 'active' when jsonb_array_length(rows)>claimed then 'locked' else 'available' end);
  if e.state='active' then active:=d;end if;rows:=rows||jsonb_build_array(d);
 end loop;
 select array_agg(id order by id) into homes from (select p.id from public.nexus_city_placements p join public.nexus_city_buildings b on b.code=p.building_code cross join lateral generate_series(1,case when b.category='home' or b.metadata->>'city_role'='housing' then 18 else 0 end) n where p.city_id=c.city_id and coalesce(p.placement_state,'placed')='placed' and (p.construction_ready_at is null or p.construction_ready_at<=now())) t;
 select array_agg(id order by id) into works from (select p.id from public.nexus_city_placements p join public.nexus_city_buildings b on b.code=p.building_code cross join lateral generate_series(1,case when b.category='shop' then 12 when b.category='community' or b.metadata->>'city_role'='mobility' then 6 when b.category='culture' or b.metadata->>'city_role'='mixed' then 8 else 0 end) n where p.city_id=c.city_id and coalesce(p.placement_state,'placed')='placed' and (p.construction_ready_at is null or p.construction_ready_at<=now())) t;
 select array_agg(p.id order by p.id) filter(where b.category='nature'),array_agg(p.id order by p.id) filter(where b.category='shop'),array_agg(p.id order by p.id) filter(where b.category='culture') into parks,shops,cultures from public.nexus_city_placements p join public.nexus_city_buildings b on b.code=p.building_code where p.city_id=c.city_id and coalesce(p.placement_state,'placed')='placed' and (p.construction_ready_at is null or p.construction_ready_at<=now());
 sample:=least(24,l.population);
 for i in 1..sample loop
  person:=floor((i-1)::numeric*l.population/greatest(1,sample))::integer+1;home:=homes[person];work:=works[person];
  activity:=case (l.day+i)%4 when 0 then 'home' when 1 then case when person<=(m->>'employed')::integer and work is not null then 'work' else 'home' end when 2 then case when coalesce(array_length(shops,1),0)>0 then 'shopping' else 'home' end else case when coalesce(array_length(parks,1),0)>0 then 'walk' when coalesce(array_length(cultures,1),0)>0 then 'culture' else 'home' end end;
  target:=case activity when 'work' then work when 'shopping' then shops[1+(i-1)%array_length(shops,1)] when 'walk' then parks[1+(i-1)%array_length(parks,1)] when 'culture' then cultures[1+(i-1)%array_length(cultures,1)] else home end;
  if home is not null then inhabitants:=inhabitants||jsonb_build_array(jsonb_build_object('id','resident-'||i,'name',names[i],'homePlacementId',home,'workPlacementId',case when person<=(m->>'employed')::integer then work else null end,'targetPlacementId',target,'activity',activity));end if;
 end loop;
 return m||jsonb_build_object('available',true,'version',1,'day',l.day,'policy',l.policy,'nextTickAt',l.last_tick+interval '30 seconds','cyclesCaughtUp',cycles,'history',l.history,'events',rows,'activeEvent',active,'inhabitants',inhabitants,'sampleSize',jsonb_array_length(inhabitants));
end $$;

create or replace function public.nexus_city_recalculate(p_user uuid)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare c public.nexus_cities; metrics jsonb; buildings integer; roads integer; displays integer;
 mission_xp bigint; event_xp bigint; construction_xp bigint; xp bigint; lvl integer; tier integer; unlock_count integer; unlocked_count integer;
begin
 select * into c from public.nexus_cities where user_id=p_user for update;
 if not found then raise exception 'Ville introuvable'; end if;
 metrics:=public.nexus_city_campaign_metrics(p_user);
 buildings:=(metrics->>'buildings')::integer; roads:=(metrics->>'roads')::integer; displays:=(metrics->>'displays')::integer;
 select coalesce(sum(granted_city_xp),0) into mission_xp from public.nexus_city_mission_progress where city_id=c.city_id;
 select coalesce(sum(granted_city_xp),0) into event_xp from public.nexus_city_life_events where city_id=c.city_id and state='claimed';
 select coalesce(sum(construction_bonus_xp),0) into construction_xp from public.nexus_city_placements where city_id=c.city_id and construction_claimed_at is not null;
 xp:=buildings*250+roads*120+displays*120+least(c.visitors,5000)+mission_xp+event_xp+construction_xp;
 lvl:=least(50,greatest(1,(xp/1000)::integer+1));
 tier:=least(10,greatest(1,((lvl-1)/4)::integer+1));
 unlock_count:=case when lvl>=29 then 8 when lvl>=22 then 7 when lvl>=16 then 6 when lvl>=11 then 5 when lvl>=7 then 4 when lvl>=4 then 3 when lvl>=2 then 2 else 1 end;
 with ranked as (
  select d.country,row_number() over(order by case when d.country=c.origin_country then 0 else 1 end,
   array_position(array['France','Algérie','Maroc','Tunisie','Espagne','Italie','Turquie','Estonie'],d.country)) rn
  from public.nexus_city_districts d where d.city_id=c.city_id
 ) update public.nexus_city_districts d set unlocked=ranked.rn<=unlock_count,
  level=case when ranked.rn<=unlock_count then greatest(1,least(10,((lvl-1)/5)::integer+1)) else 0 end,updated_at=now()
 from ranked where d.city_id=c.city_id and d.country=ranked.country;
 select count(*) into unlocked_count from public.nexus_city_districts where city_id=c.city_id and unlocked;
 update public.nexus_cities set city_xp=xp,city_level=lvl,land_tier=tier,
  city=jsonb_set(jsonb_set(jsonb_set(coalesce(city,'{}'::jsonb),'{level}',to_jsonb(lvl),true),'{xp}',to_jsonb(xp),true),'{progression}',to_jsonb('city_only'::text),true),updated_at=now()
 where city_id=c.city_id;
 return jsonb_build_object('xp',xp,'level',lvl,'landTier',tier,'districts',unlocked_count,'buildings',buildings,'roads',roads,'displays',displays,'missionXp',mission_xp,'eventXp',event_xp,'progression','city_only');
end $$;
-- The placement and wallet are locked together. A move, storage/restore, retry or reload never issues another bonus.
create function public.nexus_city_construction_claim(p_user uuid,p_placement uuid)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare c public.nexus_cities; p public.nexus_city_placements; ledger_id bigint;
begin
 if p_user is null or p_placement is null then raise exception 'Chantier invalide';end if;
 perform pg_advisory_xact_lock(hashtextextended(p_user::text,0));
 select * into c from public.nexus_cities where user_id=p_user for update;
 if not found then raise exception 'Ville introuvable';end if;
 perform 1 from public.economy_accounts where user_id=p_user for update;
 perform 1 from public.member_profiles where user_id=p_user for update;
 if not exists(select 1 from public.member_profiles where user_id=p_user and passport_state='active') then raise exception 'Passeport actif requis';end if;
 select * into p from public.nexus_city_placements where id=p_placement and city_id=c.city_id for update;
 if not found then raise exception 'Chantier introuvable';end if;
 if p.construction_claimed_at is not null then
  return jsonb_build_object('construction',true,'placement',p.id,'alreadyClaimed',true,'coins',p.construction_bonus_coins,'cityXp',p.construction_bonus_xp);
 end if;
 if p.construction_ready_at is null then raise exception 'Aucun bonus de chantier pour ce bâtiment';end if;
 if p.construction_ready_at>now() then raise exception 'Le chantier est encore en cours';end if;
 if p.placement_state<>'placed' then raise exception 'Replace le bâtiment avant son inauguration';end if;
 insert into public.threeb_wallet_ledger(user_id,event_key,event_id,xp_delta,coins_delta)
 values(p_user,'city_construction',p.id::text,0,p.construction_bonus_coins)
 on conflict(user_id,event_key,event_id) do nothing returning id into ledger_id;
 if ledger_id is null then raise exception 'Bonus déjà enregistré';end if;
 if p.construction_bonus_coins>0 then
  insert into public.economy_transactions(user_id,asset,amount,kind,source,idempotency_key,metadata) values(p_user,'coins',p.construction_bonus_coins,'earn','city_construction',p_user::text||':city_construction:'||p.id::text,jsonb_build_object('placement',p.id));
 end if;
 if p.construction_bonus_coins>0 then perform public.threeb_wallet_apply_server(p_user,0,p.construction_bonus_coins);end if;
 update public.nexus_city_placements set construction_claimed_at=now() where id=p.id;
 insert into public.nexus_city_journal(city_id,user_id,action,coins,metadata)
 values(c.city_id,p_user,'construction_complete',p.construction_bonus_coins,jsonb_build_object('placement',p.id,'cityXp',p.construction_bonus_xp));
 perform public.nexus_city_recalculate(p_user);
 return jsonb_build_object('construction',true,'placement',p.id,'alreadyClaimed',false,'coins',p.construction_bonus_coins,'cityXp',p.construction_bonus_xp);
end $$;
revoke all on function public.nexus_city_construction_claim(uuid,uuid) from public,anon,authenticated;
grant execute on function public.nexus_city_construction_claim(uuid,uuid) to service_role;

commit;
