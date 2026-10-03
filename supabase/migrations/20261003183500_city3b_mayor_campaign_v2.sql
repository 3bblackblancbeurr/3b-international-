begin;
alter table public.nexus_cities drop constraint nexus_cities_city_level_check;
alter table public.nexus_cities add constraint nexus_cities_city_level_check check(city_level between 1 and 100);
-- Extend without replacing any already-claimed mission or changing its reward.
alter table public.nexus_city_mission_definitions drop constraint nexus_city_mission_definitions_chapter_check;
alter table public.nexus_city_mission_definitions add constraint nexus_city_mission_definitions_chapter_check check(chapter between 1 and 18);
insert into public.nexus_city_mission_definitions(code,chapter,sort_order,title,description,objectives,coins,city_xp,action,optional) values
('safety_fire',9,33,'Des secours proches','Aïcha : « Ouvrons une caserne pour protéger les quartiers. »','[{"metric": "building:FIRE_STATION_3B", "target": 1, "label": "Caserne construite"}]'::jsonb,1500,2500,'{"tab": "build", "building": "FIRE_STATION_3B"}'::jsonb,false),
('safety_hospital',9,34,'Soigner une ville entière','Aïcha : « Un hôpital et huit services donnent de la place aux soins. »','[{"metric": "building:HOSPITAL_3B", "target": 1, "label": "Hôpital construit"}]'::jsonb,1700,2650,'{"tab": "build", "building": "HOSPITAL_3B"}'::jsonb,false),
('safety_services',9,35,'Un filet de sécurité','Aïcha : « Accompagnons la croissance avec dix services publics. »','[{"metric": "civic", "target": 10, "label": "Services publics construits"}]'::jsonb,1900,2800,'{"tab": "build", "building": "SCHOOL_3B"}'::jsonb,false),
('safety_replan',9,36,'La bonne place pour les secours','Aïcha : « Réorganise tes équipements pour rendre ton plan plus lisible. »','[{"metric": "moves", "target": 8, "label": "Déplacements sauvegardés"}]'::jsonb,400,600,'{"tab": "build", "building": "HOME_ORIGIN"}'::jsonb,true),
('transit_station',10,37,'Une gare pour les quartiers','Nora : « Installons la gare qui accompagnera notre métropole. »','[{"metric": "building:RAIL_STATION_3B", "target": 1, "label": "Gare construite"}]'::jsonb,1850,2950,'{"tab": "build", "building": "RAIL_STATION_3B"}'::jsonb,false),
('transit_services',10,38,'Des arrêts de proximité','Nora : « Multiplions les lieux de transport près des habitants. »','[{"metric": "mobility", "target": 4, "label": "Équipements de mobilité"}]'::jsonb,2050,3100,'{"tab": "build", "building": "BUS_STOP_3B"}'::jsonb,false),
('transit_network',10,39,'Vingt axes utiles','Nora : « Le réseau grandit : construisons vingt axes distincts. »','[{"metric": "roads", "target": 20, "label": "Axes routiers distincts"}]'::jsonb,2250,3250,'{"tab": "build", "tool": "road"}'::jsonb,false),
('transit_replan',10,40,'Repenser les correspondances','Nora : « Déplace tes constructions pour préparer de meilleures correspondances. »','[{"metric": "moves", "target": 12, "label": "Déplacements sauvegardés"}]'::jsonb,500,700,'{"tab": "build", "building": "BUS_STOP_3B"}'::jsonb,true),
('heritage_museum',11,41,'Un musée pour notre histoire','Élio : « Donnons une maison aux histoires des huit quartiers. »','[{"metric": "building:MUSEUM_3B", "target": 1, "label": "Musée construit"}]'::jsonb,2200,3400,'{"tab": "build", "building": "MUSEUM_3B"}'::jsonb,false),
('heritage_workshops',11,42,'Six lieux de transmission','Élio : « Ateliers, bibliothèque et culture rendent la ville vivante. »','[{"metric": "culture", "target": 6, "label": "Lieux culturels construits"}]'::jsonb,2400,3550,'{"tab": "build", "building": "WORKSHOP_3B"}'::jsonb,false),
('heritage_landmarks',11,43,'Trois silhouettes familières','Élio : « Créons des repères que les habitants reconnaissent de loin. »','[{"metric": "landmark", "target": 3, "label": "Monuments construits"}]'::jsonb,2600,3700,'{"tab": "build", "building": "GOLD_GATE_3B"}'::jsonb,false),
('heritage_exhibition',11,44,'Une collection personnelle','Élio : « Expose quatre objets déjà possédés ; cette demande reste facultative. »','[{"metric": "displays", "target": 4, "label": "Objets exposés"}]'::jsonb,600,800,'{"tab": "collection"}'::jsonb,true),
('housing_families',12,45,'Vingt logements pour demain','Lina : « Accueillons les nouvelles familles avec vingt logements. »','[{"metric": "housing", "target": 20, "label": "Logements construits"}]'::jsonb,2550,3850,'{"tab": "build", "building": "HOME_ORIGIN"}'::jsonb,false),
('housing_shops',12,46,'Huit commerces de proximité','Lina : « Gardons des boutiques accessibles dans les quartiers. »','[{"metric": "commerce", "target": 8, "label": "Commerces construits"}]'::jsonb,2750,4000,'{"tab": "build", "building": "SHOP_3B"}'::jsonb,false),
('housing_diversity',12,47,'Une ville aux multiples usages','Lina : « Vingt types de constructions rendent chaque quartier différent. »','[{"metric": "variety", "target": 20, "label": "Types de bâtiments"}]'::jsonb,2950,4150,'{"tab": "build", "category": "all"}'::jsonb,false),
('housing_neighbours',12,48,'Les voisins viennent découvrir','Lina : « Accueille cinq visiteurs distincts si tu souhaites partager ta ville. »','[{"metric": "visitors", "target": 5, "label": "Visiteurs distincts"}]'::jsonb,700,900,'{"tab": "settings"}'::jsonb,true),
('green_twelve',13,49,'Douze espaces pour respirer','Inès : « Réservons des jardins et des arbres à chaque quartier. »','[{"metric": "green", "target": 12, "label": "Espaces verts construits"}]'::jsonb,2900,4300,'{"tab": "build", "building": "TREE_MATRIX"}'::jsonb,false),
('green_sports',13,50,'Bouger près de chez soi','Inès : « Quatre équipements sportifs encouragent les rencontres. »','[{"metric": "sport", "target": 4, "label": "Lieux sportifs construits"}]'::jsonb,3100,4450,'{"tab": "build", "building": "ARENA_1618"}'::jsonb,false),
('green_links',13,51,'Trente chemins et routes','Inès : « Tissons des liens entre habitations, services et jardins. »','[{"metric": "roads", "target": 30, "label": "Axes routiers distincts"}]'::jsonb,3300,4600,'{"tab": "build", "tool": "road"}'::jsonb,false),
('green_redesign',13,52,'Le plan prend du recul','Inès : « Réorganise vingt constructions au fil de ta progression. »','[{"metric": "moves", "target": 20, "label": "Déplacements sauvegardés"}]'::jsonb,800,1000,'{"tab": "build", "building": "HOME_ORIGIN"}'::jsonb,true),
('economy_twelve',14,53,'Douze commerces qui travaillent','Sami : « Distribuons les commerces dans les quartiers qui grandissent. »','[{"metric": "commerce", "target": 12, "label": "Commerces construits"}]'::jsonb,3250,4750,'{"tab": "build", "building": "SHOP_3B"}'::jsonb,false),
('economy_services',14,54,'Des services pour tous','Sami : « Quinze équipements publics soutiennent le quotidien. »','[{"metric": "civic", "target": 15, "label": "Services publics construits"}]'::jsonb,3450,4900,'{"tab": "build", "building": "SCHOOL_3B"}'::jsonb,false),
('economy_city',14,55,'Soixante-dix lieux de vie','Sami : « Notre plan forme désormais une véritable cité. »','[{"metric": "buildings", "target": 70, "label": "Constructions achevées"}]'::jsonb,3650,5050,'{"tab": "build", "building": "HOME_ORIGIN"}'::jsonb,false),
('economy_display',14,56,'Une vitrine personnelle','Sami : « Présente six objets de ton inventaire dans la ville. »','[{"metric": "displays", "target": 6, "label": "Objets exposés"}]'::jsonb,900,1100,'{"tab": "collection"}'::jsonb,true),
('festival_culture',15,57,'La culture dans les quartiers','Maël : « Huit lieux culturels préparent des rencontres partout. »','[{"metric": "culture", "target": 8, "label": "Lieux culturels construits"}]'::jsonb,3600,5200,'{"tab": "build", "building": "WORKSHOP_3B"}'::jsonb,false),
('festival_sport',15,58,'Six lieux pour jouer ensemble','Maël : « Répartissons six équipements sportifs dans notre ville. »','[{"metric": "sport", "target": 6, "label": "Lieux sportifs construits"}]'::jsonb,3800,5350,'{"tab": "build", "building": "ARENA_1618"}'::jsonb,false),
('festival_homes',15,59,'Trente familles à accueillir','Maël : « Les logements restent le cœur d’une ville qui grandit. »','[{"metric": "housing", "target": 30, "label": "Logements construits"}]'::jsonb,4000,5500,'{"tab": "build", "building": "HOME_ORIGIN"}'::jsonb,false),
('festival_guests',15,60,'Le rendez-vous des visiteurs','Maël : « Invite dix membres distincts à découvrir ton plan public. »','[{"metric": "visitors", "target": 10, "label": "Visiteurs distincts"}]'::jsonb,1000,1200,'{"tab": "settings"}'::jsonb,true),
('network_forty',16,61,'Quarante axes pour circuler','Nora : « Composons un réseau vaste et lisible. »','[{"metric": "roads", "target": 40, "label": "Axes routiers distincts"}]'::jsonb,3950,5650,'{"tab": "build", "tool": "road"}'::jsonb,false),
('network_stops',16,62,'Huit équipements de mobilité','Nora : « Les transports accompagnent tous les quartiers. »','[{"metric": "mobility", "target": 8, "label": "Équipements de mobilité"}]'::jsonb,4150,5800,'{"tab": "build", "building": "BUS_STOP_3B"}'::jsonb,false),
('network_services',16,63,'Vingt services dans la métropole','Nora : « Consolidons les équipements pour durer. »','[{"metric": "civic", "target": 20, "label": "Services publics construits"}]'::jsonb,4350,5950,'{"tab": "build", "building": "SCHOOL_3B"}'::jsonb,false),
('network_replan',16,64,'Un réseau mieux organisé','Nora : « Ajuste les implantations au fil de trente déplacements. »','[{"metric": "moves", "target": 30, "label": "Déplacements sauvegardés"}]'::jsonb,1100,1300,'{"tab": "build", "building": "BUS_STOP_3B"}'::jsonb,true),
('legacy_hundred',17,65,'Cent constructions, une histoire','Conseil des quartiers : « Cent lieux composent la cité que tu as fondée. »','[{"metric": "buildings", "target": 100, "label": "Constructions achevées"}]'::jsonb,4300,6100,'{"tab": "build", "building": "HOME_ORIGIN"}'::jsonb,false),
('legacy_twenty_green',17,66,'Vingt espaces verts préservés','Conseil des quartiers : « La nature garde sa place au milieu de la métropole. »','[{"metric": "green", "target": 20, "label": "Espaces verts construits"}]'::jsonb,4500,6250,'{"tab": "build", "building": "TREE_MATRIX"}'::jsonb,false),
('legacy_monuments',17,67,'Cinq repères dans le ciel','Conseil des quartiers : « Les monuments racontent notre histoire commune. »','[{"metric": "landmark", "target": 5, "label": "Monuments construits"}]'::jsonb,4700,6400,'{"tab": "build", "building": "GOLD_GATE_3B"}'::jsonb,false),
('legacy_collection',17,68,'La collection des huit quartiers','Conseil des quartiers : « Expose huit objets déjà acquis pour partager ton héritage. »','[{"metric": "displays", "target": 8, "label": "Objets exposés"}]'::jsonb,1200,1400,'{"tab": "collection"}'::jsonb,true),
('mayor_forty_homes',18,69,'Quarante logements pour la suite','Jade : « Monsieur ou Madame le Maire, notre cité prépare son avenir. »','[{"metric": "housing", "target": 40, "label": "Logements construits"}]'::jsonb,4650,6550,'{"tab": "build", "building": "HOME_ORIGIN"}'::jsonb,false),
('mayor_diverse',18,70,'Trente usages dans la cité','Jade : « La richesse de notre ville vient de ses lieux complémentaires. »','[{"metric": "variety", "target": 30, "label": "Types de bâtiments"}]'::jsonb,4850,6700,'{"tab": "build", "category": "all"}'::jsonb,false),
('mayor_metropolis',18,71,'La métropole des habitants','Jade : « Cent trente constructions : notre première grande campagne se termine. »','[{"metric": "buildings", "target": 130, "label": "Constructions achevées"}]'::jsonb,5050,6850,'{"tab": "build", "building": "HOME_ORIGIN"}'::jsonb,false),
('mayor_visitors',18,72,'Une cité à faire découvrir','Jade : « Accueille vingt visiteurs distincts ; le jeu solo reste ouvert. »','[{"metric": "visitors", "target": 20, "label": "Visiteurs distincts"}]'::jsonb,1300,1500,'{"tab": "settings"}'::jsonb,true)
on conflict(code) do nothing;

create function public.city3b_level_floor(p_level integer) returns bigint language sql immutable security invoker set search_path='' as $$
 select case when p_level<=50 then greatest(0,p_level-1)::bigint*1000
 else 49000::bigint+(least(100,p_level)-50)::bigint*1000+40::bigint*(least(100,p_level)-50)*(least(100,p_level)-49) end
$$;
create function public.city3b_level_for_xp(p_xp bigint) returns integer language sql immutable security invoker set search_path='' as $$
 select coalesce(max(n),1) from generate_series(1,100) n where public.city3b_level_floor(n)<=greatest(0,p_xp)
$$;
revoke all on function public.city3b_level_floor(integer),public.city3b_level_for_xp(bigint) from public,anon,authenticated;
grant execute on function public.city3b_level_floor(integer),public.city3b_level_for_xp(bigint) to service_role;
-- Preserve construction/event XP, slot scoping, grants and all current calculations.
do $curve$ declare body text;begin
 body:=pg_get_functiondef('public.nexus_city_recalculate(uuid)'::regprocedure);
 if position('lvl:=least(50,greatest(1,(xp/1000)::integer+1));' in body)=0 then raise exception 'Unexpected city XP function; review before applying';end if;
 body:=replace(body,'lvl:=least(50,greatest(1,(xp/1000)::integer+1));','lvl:=public.city3b_level_for_xp(xp);');
 body:=replace(body,$needle$'{progression}',to_jsonb('city_only'::text),true)$needle$,$replacement$'{progression}',to_jsonb('city_only'::text),true) || jsonb_build_object('progression_curve','municipal-v2','max_level',100)$replacement$);
 execute body;
end $curve$;
notify pgrst,'reload schema';
commit;
