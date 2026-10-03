begin;
-- Permanent cosmetic pass. It has no recurring charge, income bonus or mandatory gameplay benefit.
-- Test-only until verified provider product/price IDs and the existing live gate are configured.
insert into public.inventory_items(code,name,category,coin_price,active,metadata,description,item_type,rarity,tradeable,marketable,permanent,stackable,max_supply)
values('PREM_CITY_ARCHITECT_PASS','Passe Architecte 3B','premium',0,true,'{"game_scope":"city","premium":true}','Styles Matrix, Champagne, quais, monument et nuit. Aucun avantage de progression.','cosmetic','epic',false,false,true,false,null)
on conflict(code) do nothing;
insert into public.digital_store_products(code,game_scope,item_code,name,description,product_kind,price_cents,currency,active,release_state,no_pay_to_win,sort_order,metadata)
values('CITY_ARCHITECT_PASS','city','PREM_CITY_ARCHITECT_PASS','Passe Architecte 3B','Un passe permanent : routes Matrix, architecture Champagne, quais décoratifs, Cercle Brisé et ambiance Nuit Luxe. Jeu et missions accessibles gratuitement.','non_consumable',990,'eur',true,'test',true,5,'{"category":"passe permanent","effects":["matrixRoads","champagneArchitecture","waterfront","brokenCircleMonument","nightLuxe"]}')
on conflict(code) do nothing;
commit;
