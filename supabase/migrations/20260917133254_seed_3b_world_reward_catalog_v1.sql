with countries(id,label) as (values
 ('france','France'),('italie','Italie'),('estonie','Estonie'),('turquie','Turquie'),('algerie','Algérie'),('tunisie','Tunisie'),('maroc','Maroc'),('espagne','Espagne')
),families(id,label) as (values
 ('skin','Skin'),('outfit','Tenue'),('weapon','Arme'),('companion','Compagnon'),('vehicle','Véhicule'),('tool','Outil'),('blueprint','Plan'),('decoration','Décoration'),('effect','Effet'),('badge','Badge')
),rarities(id,label,weight,supply) as (values
 ('common','Commun',700000000::bigint,null::bigint),('rare','Rare',200000000,null),('epic','Épique',70000000,null),('special','Spécial',20000000,null),('ultra-rare','Ultra rare',8000000,null),('legendary','Légendaire',1900000,null),('ultimate','Ultime',99999,8),('unique','Unique',1,1)
)
insert into public.inventory_items(code,name,category,coin_price,active,metadata,description,item_type,rarity,tradeable,marketable,permanent,stackable,max_supply)
select c.id||'-'||f.id||'-'||r.id,
 f.label||' '||c.label||' · '||r.label,
 'world_reward',0,true,
 jsonb_build_object('country',c.id,'family',f.id,'source','world3b','gameplay_only',true,'rarity_weight',r.weight,'token',0),
 'Récompense de gameplay du Monde 3B. Non achetable et sans conversion monétaire.',
 f.id,r.id,false,false,true,false,r.supply
from countries c cross join families f cross join rarities r
on conflict(code) do update set
 name=excluded.name,category=excluded.category,coin_price=0,active=true,metadata=excluded.metadata,description=excluded.description,item_type=excluded.item_type,rarity=excluded.rarity,tradeable=false,marketable=false,permanent=true,stackable=false,max_supply=excluded.max_supply;
