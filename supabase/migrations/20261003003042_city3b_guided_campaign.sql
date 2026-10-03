begin;

-- Construction remains free from the start. This optional guide uses city state only.
create table public.nexus_city_mission_definitions (
 code text primary key check(code ~ '^[a-z0-9_]{3,64}$'),
 chapter integer not null check(chapter between 1 and 8),
 sort_order integer not null,
 title text not null,
 description text not null,
 objectives jsonb not null check(jsonb_typeof(objectives)='array' and jsonb_array_length(objectives)>0),
 coins integer not null check(coins between 0 and 10000),
 city_xp integer not null check(city_xp between 0 and 10000),
 action jsonb not null default '{}'::jsonb,
 optional boolean not null default false,
 active boolean not null default true
);
create table public.nexus_city_mission_progress (
 city_id uuid not null references public.nexus_cities(city_id) on delete cascade,
 mission_code text not null references public.nexus_city_mission_definitions(code),
 completed_at timestamptz not null default now(),
 claimed_at timestamptz not null default now(),
 granted_coins integer not null check(granted_coins>=0),
 granted_city_xp integer not null check(granted_city_xp>=0),
 primary key(city_id,mission_code)
);
alter table public.nexus_city_mission_definitions enable row level security;
alter table public.nexus_city_mission_progress enable row level security;
revoke all on public.nexus_city_mission_definitions,public.nexus_city_mission_progress from public,anon,authenticated;
grant select on public.nexus_city_mission_definitions,public.nexus_city_mission_progress to authenticated;
grant all on public.nexus_city_mission_definitions,public.nexus_city_mission_progress to service_role;
create policy city_campaign_catalog_read on public.nexus_city_mission_definitions for select to authenticated using(active);
create policy city_campaign_progress_own on public.nexus_city_mission_progress for select to authenticated using(
 exists(select 1 from public.nexus_cities c where c.city_id=nexus_city_mission_progress.city_id and c.user_id=(select auth.uid()))
);

insert into public.nexus_city_buildings(code,name,category,unlock_level,cost_coins,footprint,metadata) values
 ('SCHOOL_3B','École de quartier','community',2,220,'{"w":2,"h":2}','{"city_role":"civic","service":"education"}'),
 ('CLINIC_3B','Clinique de quartier','community',3,280,'{"w":2,"h":2}','{"city_role":"civic","service":"health"}'),
 ('WATER_3B','Station d’eau','community',2,160,'{"w":2,"h":2}','{"city_role":"civic","service":"water"}'),
 ('SOLAR_3B','Station solaire','community',2,180,'{"w":2,"h":2}','{"city_role":"civic","service":"energy"}'),
 ('BUS_STOP_3B','Arrêt de bus','road',2,180,'{"w":1,"h":1}','{"city_role":"mobility","service":"transit"}'),
 ('CAFE_3B','Café des habitants','shop',2,200,'{"w":2,"h":1}','{"city_role":"commerce","service":"meeting"}'),
 ('WORKSHOP_3B','Atelier des cultures','culture',3,240,'{"w":2,"h":2}','{"city_role":"mixed","service":"culture"}'),
 ('LIBRARY_3B','Bibliothèque des quartiers','culture',3,260,'{"w":2,"h":2}','{"city_role":"mixed","service":"culture"}')
on conflict(code) do update set name=excluded.name,category=excluded.category,unlock_level=excluded.unlock_level,cost_coins=excluded.cost_coins,footprint=excluded.footprint,metadata=nexus_city_buildings.metadata||excluded.metadata,active=true;

insert into public.nexus_city_mission_definitions(code,chapter,sort_order,title,description,objectives,coins,city_xp,action,optional) values
 ('foundation_hall',1,1,'Notre première adresse','Lina : « Installons un lieu où accueillir les idées du quartier. »','[{"metric":"building:CITY_HALL_3B","target":1,"label":"Hôtel de Ville placé"}]'::jsonb,100,200,'{"tab":"build","building":"CITY_HALL_3B"}'::jsonb,false),
 ('foundation_homes',1,2,'Deux maisons, un début','Lina : « Il nous faut de vrais logements avant les grandes tours. »','[{"metric":"housing","target":2,"label":"Logements placés"}]'::jsonb,150,250,'{"tab":"build","building":"HOME_ORIGIN"}'::jsonb,false),
 ('foundation_road',1,3,'Le premier chemin','Lina : « Trace une route personnelle pour relier notre quartier. »','[{"metric":"roads","target":1,"label":"Axe routier distinct"}]'::jsonb,200,300,'{"tab":"build","tool":"road"}'::jsonb,false),
 ('foundation_rearrange',1,4,'Une place mieux choisie','Déplace une construction existante : ton premier plan peut évoluer.','[{"metric":"moves","target":1,"label":"Déplacement sauvegardé"}]'::jsonb,80,100,'{"tab":"build","building":"HOME_ORIGIN"}'::jsonb,true),
 ('neighbourhood_park',2,5,'Un jardin pour respirer','Sami : « Gardons une place pour la nature près des maisons. »','[{"metric":"building:PARK_UNITY","target":1,"label":"Parc de l’Unité placé"}]'::jsonb,250,400,'{"tab":"build","building":"PARK_UNITY"}'::jsonb,false),
 ('neighbourhood_shop',2,6,'Le commerce du quartier','Sami : « Ouvrons un premier commerce de proximité. »','[{"metric":"commerce","target":1,"label":"Commerce placé"}]'::jsonb,300,450,'{"tab":"build","building":"SHOP_3B"}'::jsonb,false),
 ('neighbourhood_school',2,7,'Apprendre près de chez soi','Sami : « Les familles ont besoin d’une école et de logements. »','[{"metric":"building:SCHOOL_3B","target":1,"label":"École placée"},{"metric":"housing","target":3,"label":"Logements placés"}]'::jsonb,350,500,'{"tab":"build","building":"SCHOOL_3B"}'::jsonb,false),
 ('neighbourhood_ambience',2,8,'L’ambiance de notre ville','Change un réglage d’ambiance puis enregistre-le dans les paramètres.','[{"metric":"environment_changes","target":1,"label":"Ambiance modifiée et sauvegardée"}]'::jsonb,100,150,'{"tab":"settings"}'::jsonb,true),
 ('mobility_roads',3,9,'Trois chemins utiles','Nora : « Développons un réseau, avec trois axes différents. »','[{"metric":"roads","target":3,"label":"Axes routiers distincts"}]'::jsonb,350,600,'{"tab":"build","tool":"road"}'::jsonb,false),
 ('mobility_bus',3,10,'Un arrêt pour tous','Nora : « Un transport de proximité accompagne la croissance. »','[{"metric":"building:BUS_STOP_3B","target":1,"label":"Arrêt de bus placé"}]'::jsonb,400,650,'{"tab":"build","building":"BUS_STOP_3B"}'::jsonb,false),
 ('mobility_variety',3,11,'Un quartier aux usages variés','Nora : « Six types de bâtiments donnent plus de choix aux habitants. »','[{"metric":"variety","target":6,"label":"Types de bâtiments placés"}]'::jsonb,450,700,'{"tab":"build","building":"WORKSHOP_3B"}'::jsonb,false),
 ('mobility_collection',3,12,'Un objet qui raconte','Expose un objet permanent déjà présent dans ton inventaire. Aucun achat n’est requis pour la campagne principale.','[{"metric":"displays","target":1,"label":"Objet exposé"}]'::jsonb,150,200,'{"tab":"collection"}'::jsonb,true),
 ('services_water_energy',4,13,'Eau et lumière','Aïcha : « Installons les services qui soutiennent la vie du quartier. »','[{"metric":"building:WATER_3B","target":1,"label":"Station d’eau placée"},{"metric":"building:SOLAR_3B","target":1,"label":"Station solaire placée"}]'::jsonb,450,850,'{"tab":"build","building":"WATER_3B"}'::jsonb,false),
 ('services_clinic',4,14,'Un lieu de soin','Aïcha : « Personne ne doit être oublié lorsque la ville grandit. »','[{"metric":"building:CLINIC_3B","target":1,"label":"Clinique placée"}]'::jsonb,500,900,'{"tab":"build","building":"CLINIC_3B"}'::jsonb,false),
 ('services_neighbourhood',4,15,'Un quartier équilibré','Aïcha : « Fais grandir ensemble logements, commerces et espaces verts. »','[{"metric":"housing","target":5,"label":"Logements placés"},{"metric":"commerce","target":2,"label":"Commerces placés"},{"metric":"green","target":2,"label":"Espaces verts placés"}]'::jsonb,550,1000,'{"tab":"build","building":"HOME_ORIGIN"}'::jsonb,false),
 ('services_guest',4,16,'Une première rencontre','Ouvre ta ville au public et laisse un autre membre la visiter. Cette demande est facultative.','[{"metric":"visitors","target":1,"label":"Visiteur distinct"}]'::jsonb,200,250,'{"tab":"settings"}'::jsonb,true),
 ('culture_library',5,17,'La mémoire du quartier','Élio : « Une bibliothèque donne une place à la transmission. »','[{"metric":"building:LIBRARY_3B","target":1,"label":"Bibliothèque placée"}]'::jsonb,600,1100,'{"tab":"build","building":"LIBRARY_3B"}'::jsonb,false),
 ('culture_workshop_cafe',5,18,'Faire et se retrouver','Élio : « Un atelier et un café créent deux lieux complémentaires. »','[{"metric":"building:WORKSHOP_3B","target":1,"label":"Atelier placé"},{"metric":"building:CAFE_3B","target":1,"label":"Café placé"}]'::jsonb,650,1200,'{"tab":"build","building":"WORKSHOP_3B"}'::jsonb,false),
 ('culture_festival',5,19,'Le rendez-vous du quartier','Élio : « Préparons un lieu sportif et trois espaces verts pour nos rencontres. »','[{"metric":"sport","target":1,"label":"Lieu sportif placé"},{"metric":"green","target":3,"label":"Espaces verts placés"}]'::jsonb,700,1300,'{"tab":"build","building":"ARENA_1618"}'::jsonb,false),
 ('culture_landmark',5,20,'Un repère dans le paysage','Ajoute un monument pour donner une silhouette reconnaissable à ta ville.','[{"metric":"landmark","target":1,"label":"Monument placé"}]'::jsonb,250,300,'{"tab":"build","building":"GOLD_GATE_3B"}'::jsonb,true),
 ('growth_districts',6,21,'Quatre quartiers ouverts','Inès : « Tes constructions et les missions font grandir la Ville, indépendamment du Monde 3B. »','[{"metric":"districts","target":4,"label":"Quartiers ouverts"}]'::jsonb,750,1450,'{"tab":"districts"}'::jsonb,false),
 ('growth_links',6,22,'Des services dans une ville reliée','Inès : « Six axes, six logements et trois services publics forment une nouvelle base. »','[{"metric":"roads","target":6,"label":"Axes routiers distincts"},{"metric":"housing","target":6,"label":"Logements placés"},{"metric":"civic","target":3,"label":"Services publics placés"}]'::jsonb,800,1550,'{"tab":"build","tool":"road"}'::jsonb,false),
 ('growth_identity',6,23,'Des usages et des mémoires','Inès : « Varions dix types de bâtiments et deux lieux culturels. »','[{"metric":"variety","target":10,"label":"Types de bâtiments placés"},{"metric":"culture","target":2,"label":"Lieux culturels placés"}]'::jsonb,850,1650,'{"tab":"build","building":"SHOWCASE_3B"}'::jsonb,false),
 ('growth_open',6,24,'Partager notre plan','Rends ta ville publique si tu souhaites accueillir des visiteurs. Tu peux changer ce réglage ensuite.','[{"metric":"public","target":1,"label":"Ville rendue publique"}]'::jsonb,300,350,'{"tab":"settings"}'::jsonb,true),
 ('citizens_daily_life',7,25,'Les besoins du quotidien','Maël : « Développons huit logements, trois commerces et cinq services publics. »','[{"metric":"housing","target":8,"label":"Logements placés"},{"metric":"commerce","target":3,"label":"Commerces placés"},{"metric":"civic","target":5,"label":"Services publics placés"}]'::jsonb,900,1800,'{"tab":"build","building":"HOME_ORIGIN"}'::jsonb,false),
 ('citizens_mobility',7,26,'Se déplacer dans une ville plus grande','Maël : « Huit axes et deux équipements de mobilité accompagnent notre expansion. »','[{"metric":"roads","target":8,"label":"Axes routiers distincts"},{"metric":"mobility","target":2,"label":"Équipements de mobilité placés"}]'::jsonb,950,1950,'{"tab":"build","tool":"road"}'::jsonb,false),
 ('citizens_green_identity',7,27,'Une croissance qui garde sa personnalité','Maël : « Conservons cinq espaces verts et douze types de bâtiments différents. »','[{"metric":"green","target":5,"label":"Espaces verts placés"},{"metric":"variety","target":12,"label":"Types de bâtiments placés"}]'::jsonb,1000,2100,'{"tab":"build","building":"TREE_MATRIX"}'::jsonb,false),
 ('citizens_replan',7,28,'Un plan qui évolue','Réorganise plusieurs constructions. Les déplacements restent gratuits et ne rendent pas les Coins déjà investis.','[{"metric":"moves","target":5,"label":"Déplacements sauvegardés"}]'::jsonb,350,400,'{"tab":"build","building":"HOME_ORIGIN"}'::jsonb,true),
 ('unity_districts',8,29,'Les huit quartiers','Conseil : « La construction a réuni les huit héritages dans ta propre ville. »','[{"metric":"districts","target":8,"label":"Quartiers ouverts"}]'::jsonb,1100,2300,'{"tab":"districts"}'::jsonb,false),
 ('unity_city',8,30,'Une cité composée','Conseil : « Vingt-quatre constructions, dix axes et six espaces verts donnent une ville généreuse. »','[{"metric":"buildings","target":24,"label":"Constructions placées"},{"metric":"roads","target":10,"label":"Axes routiers distincts"},{"metric":"green","target":6,"label":"Espaces verts placés"}]'::jsonb,1200,2450,'{"tab":"build","tool":"road"}'::jsonb,false),
 ('unity_living_city',8,31,'Notre ville, notre héritage','Conseil : « Achevons les lieux de vie, de service, de culture et de sport autour d’un monument. »','[{"metric":"housing","target":10,"label":"Logements placés"},{"metric":"civic","target":6,"label":"Services publics placés"},{"metric":"culture","target":3,"label":"Lieux culturels placés"},{"metric":"sport","target":2,"label":"Lieux sportifs placés"},{"metric":"landmark","target":1,"label":"Monument placé"}]'::jsonb,1400,2600,'{"tab":"build","building":"COMMUNITY_CENTER"}'::jsonb,false),
 ('unity_exhibition',8,32,'Une ville à découvrir','Présente trois objets de ton inventaire et accueille trois membres différents. Ce prolongement social reste facultatif.','[{"metric":"displays","target":3,"label":"Objets exposés"},{"metric":"visitors","target":3,"label":"Visiteurs distincts"}]'::jsonb,400,500,'{"tab":"collection"}'::jsonb,true);

-- Metrics count saved, placed constructions and distinct road segments, never client proofs.
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
 where p.city_id=c.city_id and coalesce(p.placement_state,'placed')='placed';
 select coalesce(jsonb_object_agg('building:'||code,n),'{}'::jsonb) into exact_counts from (
  select p.building_code code,count(*) n from public.nexus_city_placements p
  where p.city_id=c.city_id and coalesce(p.placement_state,'placed')='placed' group by p.building_code
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

create or replace function public.nexus_city_recalculate(p_user uuid)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare c public.nexus_cities; metrics jsonb; buildings integer; roads integer; displays integer;
 mission_xp bigint; xp bigint; lvl integer; tier integer; unlock_count integer; unlocked_count integer;
begin
 select * into c from public.nexus_cities where user_id=p_user for update;
 if not found then raise exception 'Ville introuvable'; end if;
 metrics:=public.nexus_city_campaign_metrics(p_user);
 buildings:=(metrics->>'buildings')::integer; roads:=(metrics->>'roads')::integer; displays:=(metrics->>'displays')::integer;
 select coalesce(sum(granted_city_xp),0) into mission_xp from public.nexus_city_mission_progress where city_id=c.city_id;
 xp:=buildings*250+roads*120+displays*120+least(c.visitors,5000)+mission_xp;
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
 return jsonb_build_object('xp',xp,'level',lvl,'landTier',tier,'districts',unlocked_count,'buildings',buildings,'roads',roads,'displays',displays,'missionXp',mission_xp,'progression','city_only');
end $$;

create or replace function public.nexus_city_campaign_snapshot(p_user uuid)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare cid uuid; metrics jsonb; d public.nexus_city_mission_definitions; claimed timestamptz;
 blocked boolean; ready boolean; objectives jsonb; rows jsonb:='[]'::jsonb; stats jsonb;
begin
 select city_id into cid from public.nexus_cities where user_id=p_user for update;
 if cid is null then raise exception 'Ville introuvable'; end if;
 stats:=public.nexus_city_recalculate(p_user);
 metrics:=public.nexus_city_campaign_metrics(p_user);
 for d in select * from public.nexus_city_mission_definitions where active order by sort_order loop
  select claimed_at into claimed from public.nexus_city_mission_progress where city_id=cid and mission_code=d.code;
  blocked:=exists(select 1 from public.nexus_city_mission_definitions previous
   where previous.active and not previous.optional and previous.chapter<d.chapter
   and not exists(select 1 from public.nexus_city_mission_progress p where p.city_id=cid and p.mission_code=previous.code));
  select jsonb_agg(g||jsonb_build_object('current',coalesce((metrics->>(g->>'metric'))::integer,0))),
   bool_and(coalesce((metrics->>(g->>'metric'))::integer,0)>=(g->>'target')::integer)
  into objectives,ready from jsonb_array_elements(d.objectives) g;
  rows:=rows||jsonb_build_array(jsonb_build_object('code',d.code,'chapter',d.chapter,'title',d.title,'description',d.description,
   'objectives',objectives,'coins',d.coins,'cityXp',d.city_xp,'optional',d.optional,'action',d.action,'claimedAt',claimed,
   'status',case when claimed is not null then 'claimed' when blocked then 'locked' when ready then 'ready' else 'available' end));
 end loop;
 return jsonb_build_object('available',true,'version',1,'missions',rows,'metrics',metrics,'stats',stats);
end $$;

create or replace function public.nexus_city_mission_claim(p_user uuid,p_mission text)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare cid uuid; d public.nexus_city_mission_definitions; progress public.nexus_city_mission_progress;
 metrics jsonb; ledger_id bigint;
begin
 -- Use the wallet's advisory lock before the city lock, avoiding a competing legacy wallet->city transaction.
 perform pg_advisory_xact_lock(hashtextextended(p_user::text,0));
 select city_id into cid from public.nexus_cities where user_id=p_user for update;
 if cid is null then raise exception 'Ville introuvable'; end if;
 select * into d from public.nexus_city_mission_definitions where code=p_mission and active;
 if not found then raise exception 'Mission introuvable'; end if;
 select * into progress from public.nexus_city_mission_progress where city_id=cid and mission_code=d.code;
 if found then return jsonb_build_object('mission',d.code,'alreadyClaimed',true,'coins',progress.granted_coins,'cityXp',progress.granted_city_xp); end if;
 if exists(select 1 from public.nexus_city_mission_definitions previous
  where previous.active and not previous.optional and previous.chapter<d.chapter
  and not exists(select 1 from public.nexus_city_mission_progress p where p.city_id=cid and p.mission_code=previous.code))
 then raise exception 'Termine les missions principales du chapitre précédent'; end if;
 perform public.nexus_city_recalculate(p_user);
 metrics:=public.nexus_city_campaign_metrics(p_user);
 if exists(select 1 from jsonb_array_elements(d.objectives) g where coalesce((metrics->>(g->>'metric'))::integer,0)<(g->>'target')::integer)
 then raise exception 'Les objectifs de cette mission ne sont pas encore remplis'; end if;
 -- The shared wallet locks account then profile. Check the Passport under that profile lock.
 perform public.threeb_wallet_apply_server(p_user,0,0);
 if not exists(select 1 from public.member_profiles where user_id=p_user and passport_state='active')
 then raise exception 'Passeport 3B actif requis pour recevoir cette récompense'; end if;
 insert into public.threeb_wallet_ledger(user_id,event_key,event_id,xp_delta,coins_delta)
 values(p_user,'city_campaign',d.code,0,d.coins) on conflict(user_id,event_key,event_id) do nothing returning id into ledger_id;
 if ledger_id is not null then
  insert into public.economy_transactions(user_id,asset,amount,kind,source,idempotency_key,metadata)
  values(p_user,'coins',d.coins,'earn','city3b','city:campaign:'||d.code,
   jsonb_build_object('mission',d.code,'city_id',cid,'city_xp',d.city_xp,'ledger_id',ledger_id))
  on conflict(user_id,idempotency_key) do nothing;
  perform public.threeb_wallet_apply_server(p_user,0,d.coins);
 end if;
 insert into public.nexus_city_mission_progress(city_id,mission_code,granted_coins,granted_city_xp) values(cid,d.code,d.coins,d.city_xp);
 insert into public.nexus_city_journal(city_id,user_id,action,coins,metadata)
 values(cid,p_user,'mission_claim',d.coins,jsonb_build_object('mission',d.code,'chapter',d.chapter,'city_xp',d.city_xp));
 perform public.nexus_city_recalculate(p_user);
 return jsonb_build_object('mission',d.code,'alreadyClaimed',false,'coins',d.coins,'cityXp',d.city_xp);
end $$;

-- Changing the environment is a real persisted action, recorded transactionally.
create or replace function public.nexus_city_environment(p_user uuid,p_day text,p_weather text,p_ambience text)
returns boolean language plpgsql security invoker set search_path='' as $$
declare c public.nexus_cities;
begin
 if p_day is null or p_weather is null or p_ambience is null or p_day not in ('auto','day','night') or p_weather not in ('clear','rain','fog','snow','storm') or p_ambience not in ('matrix','gold','urban','cinematic','calm') then raise exception 'Ambiance invalide'; end if;
 select * into c from public.nexus_cities where user_id=p_user for update;
 if not found then raise exception 'Ville introuvable'; end if;
 if row(c.day_mode,c.weather,c.ambience) is distinct from row(p_day,p_weather,p_ambience) then
  update public.nexus_cities set day_mode=p_day,weather=p_weather,ambience=p_ambience,revision=revision+1,updated_at=now() where city_id=c.city_id;
  insert into public.nexus_city_journal(city_id,user_id,action,metadata) values(c.city_id,p_user,'environment',jsonb_build_object('day',p_day,'weather',p_weather,'ambience',p_ambience));
 end if;
 return true;
end $$;

revoke all on function public.nexus_city_campaign_metrics(uuid),public.nexus_city_campaign_snapshot(uuid),public.nexus_city_mission_claim(uuid,text),public.nexus_city_recalculate(uuid),public.nexus_city_environment(uuid,text,text,text) from public,anon,authenticated;
grant execute on function public.nexus_city_campaign_metrics(uuid),public.nexus_city_campaign_snapshot(uuid),public.nexus_city_mission_claim(uuid,text),public.nexus_city_recalculate(uuid),public.nexus_city_environment(uuid,text,text,text) to service_role;
commit;
