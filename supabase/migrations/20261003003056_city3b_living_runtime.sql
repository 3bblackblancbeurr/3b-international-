begin;

-- A bounded, server-clock-driven neighbourhood simulation. No client census or elapsed time is accepted.
create table public.nexus_city_life (
 city_id uuid primary key references public.nexus_cities(city_id) on delete cascade,
 day integer not null default 0 check(day>=0),
 population integer not null default 0 check(population between 0 and 200000),
 policy text not null default 'balanced' check(policy in ('balanced','green','industry','culture')),
 last_tick timestamptz not null default now(),
 history jsonb not null default '[]'::jsonb check(jsonb_typeof(history)='array'),
 updated_at timestamptz not null default now()
);
create table public.nexus_city_life_events (
 city_id uuid not null references public.nexus_cities(city_id) on delete cascade,
 code text not null,
 state text not null default 'active' check(state in ('active','claimed')),
 started_day integer not null,
 held_cycles integer not null default 0 check(held_cycles>=0),
 claimed_at timestamptz,
 granted_coins integer not null default 0,
 granted_city_xp integer not null default 0,
 primary key(city_id,code)
);
create unique index nexus_city_one_active_event on public.nexus_city_life_events(city_id) where state='active';
alter table public.nexus_city_life enable row level security;
alter table public.nexus_city_life_events enable row level security;
revoke all on public.nexus_city_life,public.nexus_city_life_events from public,anon,authenticated;
grant select on public.nexus_city_life,public.nexus_city_life_events to authenticated;
grant all on public.nexus_city_life,public.nexus_city_life_events to service_role;
create policy city_life_own on public.nexus_city_life for select to authenticated using(exists(select 1 from public.nexus_cities c where c.city_id=nexus_city_life.city_id and c.user_id=(select auth.uid())));
create policy city_life_events_own on public.nexus_city_life_events for select to authenticated using(exists(select 1 from public.nexus_cities c where c.city_id=nexus_city_life_events.city_id and c.user_id=(select auth.uid())));

create function public.nexus_city_life_event_catalog()
returns jsonb language sql immutable security invoker set search_path='' as $$
 select '[
 {"code":"welcome","title":"Bienvenue chez nous","voice":"Lina","description":"Accueille les premières familles et garde un commerce ouvert pendant deux cycles.","cycles":2,"coins":120,"cityXp":250,"requirements":[{"metric":"population","target":8,"label":"Habitants installés"},{"metric":"commerce","target":1,"label":"Commerce placé"}],"action":{"tab":"build","building":"SHOP_3B"}},
 {"code":"green_walk","title":"La promenade des voisins","voice":"Sami","description":"Prépare deux espaces verts et de vrais chemins pour notre première promenade.","cycles":2,"coins":180,"cityXp":350,"requirements":[{"metric":"population","target":12,"label":"Habitants installés"},{"metric":"green","target":2,"label":"Espaces verts placés"},{"metric":"roads","target":2,"label":"Axes personnels distincts"}],"action":{"tab":"build","building":"TREE_MATRIX"}},
 {"code":"market_day","title":"Le marché du quartier","voice":"Nora","description":"Soutiens les commerçants avec eau, énergie et des habitants au rendez-vous.","cycles":3,"coins":250,"cityXp":500,"requirements":[{"metric":"population","target":20,"label":"Habitants installés"},{"metric":"commerce","target":2,"label":"Commerces placés"},{"metric":"water","target":60,"label":"Couverture de l’eau (%)"},{"metric":"energy","target":60,"label":"Couverture de l’énergie (%)"}],"action":{"tab":"build","building":"WATER_3B"}},
 {"code":"school_days","title":"La rentrée des quartiers","voice":"Aïcha","description":"Fais fonctionner ensemble l’école, les soins et les transports pendant trois cycles.","cycles":3,"coins":300,"cityXp":650,"requirements":[{"metric":"population","target":30,"label":"Habitants installés"},{"metric":"education","target":60,"label":"Couverture de l’éducation (%)"},{"metric":"health","target":60,"label":"Couverture des soins (%)"},{"metric":"mobility","target":45,"label":"Mobilité (%)"}],"action":{"tab":"build","building":"SCHOOL_3B"}},
 {"code":"makers","title":"Les ateliers ouverts","voice":"Élio","description":"Ouvre la transmission et le travail aux habitants de ta cité.","cycles":4,"coins":400,"cityXp":850,"requirements":[{"metric":"population","target":45,"label":"Habitants installés"},{"metric":"culture","target":2,"label":"Lieux culturels placés"},{"metric":"employment","target":65,"label":"Actifs avec un emploi (%)"}],"action":{"tab":"build","building":"WORKSHOP_3B"}},
 {"code":"transit_week","title":"Une ville qui se relie","voice":"Inès","description":"Maintiens un réseau de transport et cinq axes pour faciliter le quotidien.","cycles":4,"coins":500,"cityXp":1100,"requirements":[{"metric":"population","target":60,"label":"Habitants installés"},{"metric":"mobility","target":65,"label":"Mobilité (%)"},{"metric":"roads","target":5,"label":"Axes personnels distincts"}],"action":{"tab":"build","tool":"road"}},
 {"code":"neighbourhood_festival","title":"Le festival des habitants","voice":"Maël","description":"Réunis culture, sport et espaces verts ; conserve une ville agréable pendant cinq cycles.","cycles":5,"coins":650,"cityXp":1400,"requirements":[{"metric":"population","target":80,"label":"Habitants installés"},{"metric":"culture","target":3,"label":"Lieux culturels placés"},{"metric":"sport","target":1,"label":"Lieu sportif placé"},{"metric":"happiness","target":65,"label":"Bien-être (%)"}],"action":{"tab":"build","building":"ARENA_1618"}},
 {"code":"eight_heritages","title":"La fête des huit héritages","voice":"Conseil des quartiers","description":"Rassemble les huit quartiers dans une ville qui prend soin de ses habitants.","cycles":6,"coins":800,"cityXp":1800,"requirements":[{"metric":"population","target":100,"label":"Habitants installés"},{"metric":"districts","target":8,"label":"Quartiers ouverts"},{"metric":"happiness","target":70,"label":"Bien-être (%)"},{"metric":"employment","target":75,"label":"Actifs avec un emploi (%)"}],"action":{"tab":"districts"}}
 ]'::jsonb;
$$;

create function public.nexus_city_life_road_distance(px numeric,pz numeric,r jsonb)
returns numeric language plpgsql immutable security invoker set search_path='' as $$
declare x1 numeric;z1 numeric;dx numeric;dz numeric;t numeric;len numeric;
begin
 if jsonb_typeof(r->'x1') is distinct from 'number' or jsonb_typeof(r->'z1') is distinct from 'number' or jsonb_typeof(r->'x2') is distinct from 'number' or jsonb_typeof(r->'z2') is distinct from 'number' then return 1000000;end if;
 x1:=(r->>'x1')::numeric;z1:=(r->>'z1')::numeric;dx:=(r->>'x2')::numeric-x1;dz:=(r->>'z2')::numeric-z1;len:=dx*dx+dz*dz;
 if len<36 then return 1000000;end if;t:=greatest(0,least(1,((px-x1)*dx+(pz-z1)*dz)/len));
 return sqrt(power(px-(x1+t*dx),2)+power(pz-(z1+t*dz),2));
end $$;

create function public.nexus_city_life_metrics(p_user uuid,p_population integer,p_policy text)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare c public.nexus_cities; m jsonb; capacity integer:=0; jobs integer:=0; connected integer:=0; total integer:=0;
 water integer:=0; energy integer:=0; health integer:=0; education integer:=0; food integer:=0; green integer:=0; culture integer:=0; transit integer:=0;
 b record; role text; half numeric; px numeric; pz numeric; close_road boolean; working integer; employed integer; mobility integer; happiness integer; needs jsonb:='[]'::jsonb; n record; score integer; demand integer;
begin
 select * into c from public.nexus_cities where user_id=p_user;
 if not found then raise exception 'Ville introuvable'; end if;
 m:=public.nexus_city_campaign_metrics(p_user); half:=50+greatest(1,c.land_tier)*45;
 for b in select p.*,d.category,d.metadata from public.nexus_city_placements p join public.nexus_city_buildings d on d.code=p.building_code
  where p.city_id=c.city_id and coalesce(p.placement_state,'placed')='placed' loop
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

create function public.nexus_city_life_snapshot(p_user uuid)
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
 select array_agg(id order by id) into homes from (select p.id from public.nexus_city_placements p join public.nexus_city_buildings b on b.code=p.building_code cross join lateral generate_series(1,case when b.category='home' or b.metadata->>'city_role'='housing' then 18 else 0 end) n where p.city_id=c.city_id and coalesce(p.placement_state,'placed')='placed') t;
 select array_agg(id order by id) into works from (select p.id from public.nexus_city_placements p join public.nexus_city_buildings b on b.code=p.building_code cross join lateral generate_series(1,case when b.category='shop' then 12 when b.category='community' or b.metadata->>'city_role'='mobility' then 6 when b.category='culture' or b.metadata->>'city_role'='mixed' then 8 else 0 end) n where p.city_id=c.city_id and coalesce(p.placement_state,'placed')='placed') t;
 select array_agg(p.id order by p.id) filter(where b.category='nature'),array_agg(p.id order by p.id) filter(where b.category='shop'),array_agg(p.id order by p.id) filter(where b.category='culture') into parks,shops,cultures from public.nexus_city_placements p join public.nexus_city_buildings b on b.code=p.building_code where p.city_id=c.city_id and coalesce(p.placement_state,'placed')='placed';
 sample:=least(24,l.population);
 for i in 1..sample loop
  person:=floor((i-1)::numeric*l.population/greatest(1,sample))::integer+1;home:=homes[person];work:=works[person];
  activity:=case (l.day+i)%4 when 0 then 'home' when 1 then case when person<=(m->>'employed')::integer and work is not null then 'work' else 'home' end when 2 then case when coalesce(array_length(shops,1),0)>0 then 'shopping' else 'home' end else case when coalesce(array_length(parks,1),0)>0 then 'walk' when coalesce(array_length(cultures,1),0)>0 then 'culture' else 'home' end end;
  target:=case activity when 'work' then work when 'shopping' then shops[1+(i-1)%array_length(shops,1)] when 'walk' then parks[1+(i-1)%array_length(parks,1)] when 'culture' then cultures[1+(i-1)%array_length(cultures,1)] else home end;
  if home is not null then inhabitants:=inhabitants||jsonb_build_array(jsonb_build_object('id','resident-'||i,'name',names[i],'homePlacementId',home,'workPlacementId',case when person<=(m->>'employed')::integer then work else null end,'targetPlacementId',target,'activity',activity));end if;
 end loop;
 return m||jsonb_build_object('available',true,'version',1,'day',l.day,'policy',l.policy,'nextTickAt',l.last_tick+interval '30 seconds','cyclesCaughtUp',cycles,'history',l.history,'events',rows,'activeEvent',active,'inhabitants',inhabitants,'sampleSize',jsonb_array_length(inhabitants));
end $$;

create function public.nexus_city_life_action(p_user uuid,p_action text,p_value text,p_request uuid)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare c public.nexus_cities;view jsonb;event jsonb;progress public.nexus_city_life_events;ledger_id bigint;reward jsonb:=null;
begin
 if p_user is null or p_request is null then raise exception 'Demande invalide';end if;
 -- Same lock order as construction/campaign: wallet advisory before city, then simulation.
 perform pg_advisory_xact_lock(hashtextextended(p_user::text,0));
 select * into c from public.nexus_cities where user_id=p_user for update;
 if not found then raise exception 'Ville introuvable';end if;
 view:=public.nexus_city_life_snapshot(p_user);
 if p_action='advance' then return view;end if;
 if p_action='policy_set' then
  if p_value is null or p_value not in ('balanced','green','industry','culture') then raise exception 'Orientation invalide';end if;
  update public.nexus_city_life set policy=p_value,updated_at=now() where city_id=c.city_id;
 elsif p_action in ('event_start','event_claim') then
  select v into event from jsonb_array_elements(view->'events') v where v->>'code'=p_value;
  if event is null then raise exception 'Événement introuvable';end if;
  select * into progress from public.nexus_city_life_events where city_id=c.city_id and code=p_value;
  if p_action='event_start' then
   if progress.code is not null then return view;end if;
   if event->>'status'<>'available' then raise exception 'Termine le rendez-vous précédent';end if;
   if view->'activeEvent'<>'null'::jsonb then raise exception 'Un rendez-vous est déjà en cours';end if;
   insert into public.nexus_city_life_events(city_id,code,started_day) values(c.city_id,p_value,(view->>'day')::integer);
   update public.nexus_city_life set last_tick=now() where city_id=c.city_id;
  else
   if progress.state='claimed' then return view||jsonb_build_object('reward',jsonb_build_object('event',p_value,'alreadyClaimed',true,'coins',progress.granted_coins,'cityXp',progress.granted_city_xp));end if;
   if event->>'status'<>'ready' then raise exception 'Les objectifs doivent être maintenus pendant les cycles demandés';end if;
   perform public.threeb_wallet_apply_server(p_user,0,0);
   if not exists(select 1 from public.member_profiles where user_id=p_user and passport_state='active') then raise exception 'Passeport 3B actif requis pour recevoir cette récompense';end if;
   insert into public.threeb_wallet_ledger(user_id,event_key,event_id,xp_delta,coins_delta) values(p_user,'city_life',p_value,0,(event->>'coins')::integer) on conflict(user_id,event_key,event_id) do nothing returning id into ledger_id;
   if ledger_id is not null then
    insert into public.economy_transactions(user_id,asset,amount,kind,source,idempotency_key,metadata) values(p_user,'coins',(event->>'coins')::integer,'earn','city_life',p_user::text||':city_life:'||p_value,jsonb_build_object('city',c.city_id,'event',p_value));
    perform public.threeb_wallet_apply_server(p_user,0,(event->>'coins')::integer);
   end if;
   update public.nexus_city_life_events set state='claimed',claimed_at=now(),granted_coins=(event->>'coins')::integer,granted_city_xp=(event->>'cityXp')::integer where city_id=c.city_id and code=p_value;
   insert into public.nexus_city_journal(city_id,user_id,action,coins,metadata) values(c.city_id,p_user,'life_event_claim',(event->>'coins')::integer,jsonb_build_object('event',p_value,'cityXp',(event->>'cityXp')::integer));
   perform public.nexus_city_recalculate(p_user);
   reward:=jsonb_build_object('event',p_value,'alreadyClaimed',ledger_id is null,'coins',(event->>'coins')::integer,'cityXp',(event->>'cityXp')::integer);
  end if;
 else raise exception 'Action de ville inconnue';end if;
 return public.nexus_city_life_snapshot(p_user)||jsonb_build_object('reward',reward);
end $$;

revoke all on function public.nexus_city_life_event_catalog(),public.nexus_city_life_road_distance(numeric,numeric,jsonb),public.nexus_city_life_metrics(uuid,integer,text),public.nexus_city_life_snapshot(uuid),public.nexus_city_life_action(uuid,text,text,uuid) from public,anon,authenticated;
grant execute on function public.nexus_city_life_event_catalog(),public.nexus_city_life_road_distance(numeric,numeric,jsonb),public.nexus_city_life_metrics(uuid,integer,text),public.nexus_city_life_snapshot(uuid),public.nexus_city_life_action(uuid,text,text,uuid) to service_role;

-- Preserve the latest city JSON while editing roads, including concurrent progression updates.
create function public.nexus_city_plan_roads(p_user uuid,p_roads jsonb)
returns void language plpgsql security invoker set search_path='' as $$
declare c public.nexus_cities;r jsonb;half numeric;clean jsonb:='[]'::jsonb;
begin
 select * into c from public.nexus_cities where user_id=p_user for update;
 if not found then raise exception 'Ville introuvable';end if;
 if p_roads is null or jsonb_typeof(p_roads)<>'array' or jsonb_array_length(p_roads)>64 then raise exception 'Plan routier invalide';end if;
 half:=50+greatest(1,least(10,c.land_tier))*45;
 for r in select * from jsonb_array_elements(p_roads) loop
  if jsonb_typeof(r->'x1') is distinct from 'number' or jsonb_typeof(r->'z1') is distinct from 'number' or jsonb_typeof(r->'x2') is distinct from 'number' or jsonb_typeof(r->'z2') is distinct from 'number' then raise exception 'Coordonnées de route invalides';end if;
  if greatest(abs((r->>'x1')::numeric),abs((r->>'x2')::numeric),abs((r->>'z1')::numeric),abs((r->>'z2')::numeric))>half or greatest((r->>'z1')::numeric,(r->>'z2')::numeric)>half*.91-1 then raise exception 'Route hors du terrain';end if;
  if power((r->>'x2')::numeric-(r->>'x1')::numeric,2)+power((r->>'z2')::numeric-(r->>'z1')::numeric,2)<36 then raise exception 'Route trop courte';end if;
  clean:=clean||jsonb_build_array(jsonb_build_object('id',left(coalesce(r->>'id','road-'||(jsonb_array_length(clean)+1)::text),80),'x1',round((r->>'x1')::numeric),'z1',round((r->>'z1')::numeric),'x2',round((r->>'x2')::numeric),'z2',round((r->>'z2')::numeric),'width',case when jsonb_typeof(r->'width')='number' then greatest(2,least(10,(r->>'width')::numeric)) else 4 end));
 end loop;
 update public.nexus_cities set city=jsonb_set(coalesce(city,'{}'::jsonb),'{roads}',clean,true),updated_at=now() where city_id=c.city_id;
 insert into public.nexus_city_journal(city_id,user_id,action,coins,metadata) values(c.city_id,p_user,'road_plan',0,jsonb_build_object('roads',jsonb_array_length(clean)));
 perform public.nexus_city_recalculate(p_user);
end $$;
revoke all on function public.nexus_city_plan_roads(uuid,jsonb) from public,anon,authenticated;
grant execute on function public.nexus_city_plan_roads(uuid,jsonb) to service_role;

create or replace function public.nexus_city_recalculate(p_user uuid)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare c public.nexus_cities; metrics jsonb; buildings integer; roads integer; displays integer;
 mission_xp bigint; event_xp bigint; xp bigint; lvl integer; tier integer; unlock_count integer; unlocked_count integer;
begin
 select * into c from public.nexus_cities where user_id=p_user for update;
 if not found then raise exception 'Ville introuvable'; end if;
 metrics:=public.nexus_city_campaign_metrics(p_user);
 buildings:=(metrics->>'buildings')::integer; roads:=(metrics->>'roads')::integer; displays:=(metrics->>'displays')::integer;
 select coalesce(sum(granted_city_xp),0) into mission_xp from public.nexus_city_mission_progress where city_id=c.city_id;
 select coalesce(sum(granted_city_xp),0) into event_xp from public.nexus_city_life_events where city_id=c.city_id and state='claimed';
 xp:=buildings*250+roads*120+displays*120+least(c.visitors,5000)+mission_xp+event_xp;
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


commit;
