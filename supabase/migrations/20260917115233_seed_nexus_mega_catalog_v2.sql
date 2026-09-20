with countries as (
 select * from (values
 ('france','France',100,array['verrière verticale','pierre et rubans Matrix','toit mansardé futuriste','arc ferroviaire','façade atelier']::text[]),
 ('algerie','Algérie',100,array['terrasses blanches','casbah verticale','arc de source','patio oasis','volumes sahariens']::text[]),
 ('maroc','Maroc',100,array['zellige paramétrique','riad vertical','arc Atlas','cour jardin','volumes ocre']::text[]),
 ('tunisie','Tunisie',100,array['blanc méditerranéen','arc bleu futuriste','terrasse Carthage','patio marin','mosaïque cinétique']::text[]),
 ('turquie','Turquie',100,array['dôme suspendu','croissant structurel','terrasse Bosphore','volume Cappadoce','arc astrolabe']::text[]),
 ('espagne','Espagne',100,array['patio solaire','arc cinétique','façade azulejo','terrasse andalouse','tour du vent']::text[]),
 ('italie','Italie',100,array['loggia verticale','marbre cinétique','arc Renaissance','terrasse toscane','dôme contemporain']::text[]),
 ('estonie','Estonie',100,array['cristal boréal','forteresse nordique','bois-verre sombre','tour d’aurore','volume baltique']::text[]),
 ('international','3B International',160,array['cercle brisé structurel','rubans des huit valeurs','mégatour Matrix','agora orbitale','verre noir et or']::text[])
 ) c(key,display,target,forms)
), types as (
 select row_number() over()::int as ord,code,label from unnest(
 array['home','villa','residence','apartment','tower','skyscraper','shop','hotel','restaurant','workshop','factory','school','culture','hospital','stadium','arena','station','transit','port','energy','monument','park','square','bridge','tunnel','road','street','furniture','garden','market','library','museum','lab','community','garage','farm','water','sport','event','lookout']::text[],
 array['Maison','Villa','Résidence','Immeuble','Tour','Gratte-ciel','Commerce','Hôtel','Restaurant','Atelier','Manufacture','École','Centre culturel','Centre de soins','Stade','Arène','Gare','Station','Port','Énergie','Monument','Parc','Place','Pont','Tunnel','Route','Rue','Mobilier','Jardin','Marché','Bibliothèque','Musée','Centre technologique','Maison communautaire','Garage','Ferme urbaine','Infrastructure eau','Complexe sportif','Scène','Belvédère']::text[]
 ) as u(code,label)
), generated as (
 select
  'mega-'||c.key||'-'||lpad(gs::text,3,'0') as code,
  t.label||' · '||c.forms[((floor((gs-1)/40)::int)%5)+1]||' '||(floor((gs-1)/200)::int+1) as name,
  t.code as category,
  c.display as country,
  1+((gs-1)%50) as unlock_level,
  (60+((gs-1)%25)*45)::bigint as cost_coins,
  jsonb_build_object('w',8+((gs-1)*7)%30,'h',8+((gs-1)*11)%26) as footprint,
  jsonb_build_object(
    'mega',true,'country_key',c.key,'type',t.code,'form',c.forms[((floor((gs-1)/40)::int)%5)+1],
    'height',4+((gs-1)*13)%80,'upgrade_levels',5,'rotation_step',15,
    'rarity',case when (gs-1)%97=0 then 'legendary' when (gs-1)%23=0 then 'epic' when (gs-1)%7=0 then 'rare' else 'common' end
  ) as metadata
 from countries c cross join lateral generate_series(1,c.target) gs
 join types t on t.ord=((gs-1)%40)+1
)
insert into public.nexus_city_buildings(code,name,category,country,unlock_level,cost_coins,footprint,permanent,active,metadata)
select code,name,category,country,unlock_level,cost_coins,footprint,false,true,metadata from generated
on conflict(code) do update set name=excluded.name,category=excluded.category,country=excluded.country,unlock_level=excluded.unlock_level,cost_coins=excluded.cost_coins,footprint=excluded.footprint,permanent=excluded.permanent,active=excluded.active,metadata=excluded.metadata;
