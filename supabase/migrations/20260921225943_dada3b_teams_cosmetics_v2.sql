create table if not exists public.dada_cosmetic_loadouts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  totem_skin text not null default 'DADA_TOTEM_CORE',
  trail text not null default 'DADA_TRAIL_MATRIX',
  dice_skin text not null default 'DADA_DICE_CORE',
  board_skin text not null default 'DADA_BOARD_NEXUS',
  capture_fx text not null default 'DADA_CAPTURE_FRACTURE',
  intro_fx text not null default 'DADA_INTRO_EIGHT_DOORS',
  updated_at timestamptz not null default now()
);

alter table public.dada_cosmetic_loadouts enable row level security;
revoke all on public.dada_cosmetic_loadouts from anon, authenticated;
comment on table public.dada_cosmetic_loadouts is 'Server-authoritative DADA 3B cosmetic loadout. Cosmetic only; no gameplay power.';

insert into public.inventory_items
(code,name,category,coin_price,active,metadata,description,item_type,rarity,tradeable,marketable,permanent,stackable,max_supply,minted_count)
values
('DADA_TOTEM_CORE','Totem 3B · Noyau','cosmetic',0,true,'{"game":"dada3b","slot":"totem_skin","collection":"core","starter":true,"pay_to_win":false}'::jsonb,'Totem standard du Cercle 3B.','skin','common',false,false,true,false,null,0),
('DADA_TRAIL_MATRIX','Trace · Matrix bleue','cosmetic',0,true,'{"game":"dada3b","slot":"trail","collection":"core","starter":true,"pay_to_win":false}'::jsonb,'Trace lumineuse bleue lors des déplacements.','effect','common',false,false,true,false,null,0),
('DADA_DICE_CORE','Dé · Noyau 3B','cosmetic',0,true,'{"game":"dada3b","slot":"dice_skin","collection":"core","starter":true,"pay_to_win":false}'::jsonb,'Dé numérique standard DADA 3B.','cosmetic','common',false,false,true,false,null,0),
('DADA_BOARD_NEXUS','Plateau · Nexus','cosmetic',0,true,'{"game":"dada3b","slot":"board_skin","collection":"core","starter":true,"pay_to_win":false}'::jsonb,'Plateau noir, or champagne et Matrix.','cosmetic','common',false,false,true,false,null,0),
('DADA_CAPTURE_FRACTURE','Capture · Fracture Matrix','cosmetic',0,true,'{"game":"dada3b","slot":"capture_fx","collection":"core","starter":true,"pay_to_win":false}'::jsonb,'Effet de capture Fracture Matrix.','effect','common',false,false,true,false,null,0),
('DADA_INTRO_EIGHT_DOORS','Intro · Huit Portes','cosmetic',0,true,'{"game":"dada3b","slot":"intro_fx","collection":"core","starter":true,"pay_to_win":false}'::jsonb,'Ouverture des huit Portes avant la partie.','animation','common',false,false,true,false,null,0),
('DADA_TOTEM_FR_JUSTICE','Totem France · Justice','cosmetic',0,true,'{"game":"dada3b","slot":"totem_skin","collection":"eight-values","country":"fr","guardian":"Céliane","value":"Justice","pay_to_win":false}'::jsonb,'Totem national de Céliane et de la Justice.','skin','rare',false,false,true,false,null,0),
('DADA_TOTEM_DZ_LOYALTY','Totem Algérie · Loyauté','cosmetic',0,true,'{"game":"dada3b","slot":"totem_skin","collection":"eight-values","country":"dz","guardian":"Yliane","value":"Loyauté","pay_to_win":false}'::jsonb,'Totem national de Yliane et de la Loyauté.','skin','rare',false,false,true,false,null,0),
('DADA_TOTEM_ES_PASSION','Totem Espagne · Passion','cosmetic',0,true,'{"game":"dada3b","slot":"totem_skin","collection":"eight-values","country":"es","guardian":"Diego","value":"Passion","pay_to_win":false}'::jsonb,'Totem national de Diego et de la Passion.','skin','rare',false,false,true,false,null,0),
('DADA_TOTEM_MA_NOBILITY','Totem Maroc · Noblesse','cosmetic',0,true,'{"game":"dada3b","slot":"totem_skin","collection":"eight-values","country":"ma","guardian":"Naël","value":"Noblesse","pay_to_win":false}'::jsonb,'Totem national de Naël et de la Noblesse.','skin','epic',false,false,true,false,null,0),
('DADA_TOTEM_IT_HOPE','Totem Italie · Espoir','cosmetic',0,true,'{"game":"dada3b","slot":"totem_skin","collection":"eight-values","country":"it","guardian":"Alessio","value":"Espoir","pay_to_win":false}'::jsonb,'Totem national d’Alessio et de l’Espoir.','skin','epic',false,false,true,false,null,0),
('DADA_TOTEM_TN_COURAGE','Totem Tunisie · Courage','cosmetic',0,true,'{"game":"dada3b","slot":"totem_skin","collection":"eight-values","country":"tn","guardian":"Soraya","value":"Courage","pay_to_win":false}'::jsonb,'Totem national de Soraya et du Courage.','skin','epic',false,false,true,false,null,0),
('DADA_TOTEM_TR_FAITH','Totem Turquie · Foi','cosmetic',0,true,'{"game":"dada3b","slot":"totem_skin","collection":"eight-values","country":"tr","guardian":"Émir","value":"Foi","pay_to_win":false}'::jsonb,'Totem national d’Émir et de la Foi.','skin','legendary',false,false,true,false,null,0),
('DADA_TOTEM_EE_WISDOM','Totem Estonie · Sagesse','cosmetic',0,true,'{"game":"dada3b","slot":"totem_skin","collection":"eight-values","country":"ee","guardian":"Eira","value":"Sagesse","pay_to_win":false}'::jsonb,'Totem national d’Eira et de la Sagesse.','skin','legendary',false,false,true,false,null,0),
('DADA_DICE_CHAMPAGNE','Dé · Or champagne','cosmetic',0,true,'{"game":"dada3b","slot":"dice_skin","collection":"cercle-fondateur","pay_to_win":false}'::jsonb,'Dé champagne avec chiffres Matrix.','cosmetic','epic',false,false,true,false,null,0),
('DADA_TRAIL_GOLD','Trace · Héritage or','cosmetic',0,true,'{"game":"dada3b","slot":"trail","collection":"cercle-fondateur","pay_to_win":false}'::jsonb,'Trace or champagne derrière le Totem.','effect','epic',false,false,true,false,null,0),
('DADA_CAPTURE_FRACTURE_GOLD','Capture · Fracture Héritage','cosmetic',0,true,'{"game":"dada3b","slot":"capture_fx","collection":"cercle-fondateur","pay_to_win":false}'::jsonb,'Fracture Matrix avec anneau champagne.','effect','legendary',false,false,true,false,null,0),
('DADA_BOARD_EIGHT_VALUES','Plateau · Huit Valeurs','cosmetic',0,true,'{"game":"dada3b","slot":"board_skin","collection":"cercle-fondateur","pay_to_win":false}'::jsonb,'Plateau cérémoniel des huit valeurs 3B.','cosmetic','legendary',false,false,true,false,null,0)
on conflict(code) do update set
 name=excluded.name,category=excluded.category,active=excluded.active,metadata=excluded.metadata,
 description=excluded.description,item_type=excluded.item_type,rarity=excluded.rarity,
 tradeable=excluded.tradeable,marketable=excluded.marketable,permanent=true,stackable=false;

insert into public.collectible_reward_rules(code,item_code,label,xp_required,active,sort_order)
values
('dada_xp_1000_fr','DADA_TOTEM_FR_JUSTICE','DADA 3B · 1 000 XP · France Justice',1000,true,110),
('dada_xp_1500_dz','DADA_TOTEM_DZ_LOYALTY','DADA 3B · 1 500 XP · Algérie Loyauté',1500,true,120),
('dada_xp_2200_es','DADA_TOTEM_ES_PASSION','DADA 3B · 2 200 XP · Espagne Passion',2200,true,130),
('dada_xp_3200_ma','DADA_TOTEM_MA_NOBILITY','DADA 3B · 3 200 XP · Maroc Noblesse',3200,true,140),
('dada_xp_4500_it','DADA_TOTEM_IT_HOPE','DADA 3B · 4 500 XP · Italie Espoir',4500,true,150),
('dada_xp_6000_tn','DADA_TOTEM_TN_COURAGE','DADA 3B · 6 000 XP · Tunisie Courage',6000,true,160),
('dada_xp_8000_tr','DADA_TOTEM_TR_FAITH','DADA 3B · 8 000 XP · Turquie Foi',8000,true,170),
('dada_xp_10000_ee','DADA_TOTEM_EE_WISDOM','DADA 3B · 10 000 XP · Estonie Sagesse',10000,true,180),
('dada_xp_12000_dice','DADA_DICE_CHAMPAGNE','DADA 3B · 12 000 XP · Dé Or champagne',12000,true,190),
('dada_xp_14000_trail','DADA_TRAIL_GOLD','DADA 3B · 14 000 XP · Trace Héritage',14000,true,200),
('dada_xp_17000_capture','DADA_CAPTURE_FRACTURE_GOLD','DADA 3B · 17 000 XP · Fracture Héritage',17000,true,210),
('dada_xp_20000_board','DADA_BOARD_EIGHT_VALUES','DADA 3B · 20 000 XP · Plateau Huit Valeurs',20000,true,220)
on conflict(code) do update set item_code=excluded.item_code,label=excluded.label,xp_required=excluded.xp_required,active=excluded.active,sort_order=excluded.sort_order;

insert into public.inventory(user_id,item_code,quantity)
select u.id,i.code,1
from auth.users u
cross join public.inventory_items i
where i.code in ('DADA_TOTEM_CORE','DADA_TRAIL_MATRIX','DADA_DICE_CORE','DADA_BOARD_NEXUS','DADA_CAPTURE_FRACTURE','DADA_INTRO_EIGHT_DOORS')
on conflict(user_id,item_code) do nothing;