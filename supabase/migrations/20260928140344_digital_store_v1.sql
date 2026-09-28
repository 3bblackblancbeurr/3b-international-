begin;

insert into public.inventory_items(code,name,category,coin_price,active,metadata,description,item_type,rarity,tradeable,marketable,permanent,stackable,max_supply)
values
('PREM_WORLD_KAIS_JACKET','Veste Kaïs · Premium','premium',0,true,jsonb_build_object('game_scope','world','premium',true),'Tenue premium permanente inspirée de Kaïs. Aucun avantage de puissance.','outfit','epic',false,false,true,false,null),
('PREM_WORLD_MATRIX_AURA','Aura Matrix · Premium','premium',0,true,jsonb_build_object('game_scope','world','premium',true),'Aura visuelle premium permanente bleu Matrix. Aucun avantage de puissance.','effect','rare',false,false,true,false,null),
('PREM_WORLD_BROKEN_RING','Effet Cercle Brisé · Premium','premium',0,true,jsonb_build_object('game_scope','world','premium',true),'Effet cosmétique premium permanent du Cercle Brisé.','effect','epic',false,false,true,false,null),
('PREM_WORLD_EIGHT_DOORS','Arrivée Huit Portes · Premium','premium',0,true,jsonb_build_object('game_scope','world','premium',true),'Animation d’arrivée premium permanente des Huit Portes.','animation','legendary',false,false,true,false,null),
('PREM_WORLD_REFUGE_CHAMPAGNE','Refuge Champagne · Premium','premium',0,true,jsonb_build_object('game_scope','world','premium',true),'Pack décoratif premium permanent pour le refuge.','decoration','epic',false,false,true,false,null),
('PREM_CITY_MATRIX_ROADS','Routes Matrix · Premium','premium',0,true,jsonb_build_object('game_scope','city','premium',true),'Thème premium permanent pour les routes de Créer ma Ville.','decoration','rare',false,false,true,false,null),
('PREM_CITY_CHAMPAGNE_ARCH','Architecture Champagne · Premium','premium',0,true,jsonb_build_object('game_scope','city','premium',true),'Pack premium permanent de façades et d’architecture.','decoration','epic',false,false,true,false,null),
('PREM_CITY_WATERFRONT','Waterfront · Premium','premium',0,true,jsonb_build_object('game_scope','city','premium',true),'Pack premium permanent d’aménagement des zones d’eau.','decoration','epic',false,false,true,false,null),
('PREM_CITY_BROKEN_MONUMENT','Monument Cercle Brisé · Premium','premium',0,true,jsonb_build_object('game_scope','city','premium',true),'Monument décoratif premium permanent pour Créer ma Ville.','world_object','legendary',false,false,true,false,null),
('PREM_CITY_NIGHT_LUXE','Nuit Luxe · Premium','premium',0,true,jsonb_build_object('game_scope','city','premium',true),'Ambiance nocturne premium permanente pour Créer ma Ville.','cosmetic','rare',false,false,true,false,null)
on conflict(code) do update set name=excluded.name,description=excluded.description,item_type=excluded.item_type,rarity=excluded.rarity,tradeable=false,marketable=false,permanent=true,active=true,metadata=excluded.metadata;

create table if not exists public.digital_store_products(
 code text primary key,
 game_scope text not null check(game_scope in ('world','city','universal')),
 item_code text not null references public.inventory_items(code),
 name text not null check(length(name) between 2 and 160),
 description text not null default '',
 product_kind text not null default 'non_consumable' check(product_kind in ('non_consumable','subscription')),
 price_cents integer not null check(price_cents between 50 and 50000),
 currency text not null default 'eur' check(currency='eur'),
 active boolean not null default true,
 release_state text not null default 'test' check(release_state in ('test','ready','live','retired')),
 no_pay_to_win boolean not null default true check(no_pay_to_win=true),
 stripe_product_id text,
 stripe_price_id text,
 google_product_id text,
 apple_product_id text,
 sort_order integer not null default 0,
 metadata jsonb not null default '{}'::jsonb check(jsonb_typeof(metadata)='object'),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create unique index if not exists digital_store_stripe_price_uq on public.digital_store_products(stripe_price_id) where stripe_price_id is not null;
create unique index if not exists digital_store_google_product_uq on public.digital_store_products(google_product_id) where google_product_id is not null;
create unique index if not exists digital_store_apple_product_uq on public.digital_store_products(apple_product_id) where apple_product_id is not null;

create table if not exists public.digital_store_purchases(
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete restrict,
 product_code text not null references public.digital_store_products(code),
 provider text not null check(provider in ('stripe','google_play','app_store','manual_test')),
 provider_transaction_id text not null check(length(provider_transaction_id) between 4 and 240),
 provider_product_ref text,
 amount_cents integer check(amount_cents is null or amount_cents>=0),
 currency text check(currency is null or currency='eur'),
 status text not null check(status in ('paid','refunded','revoked','failed')),
 receipt_hash text,
 item_instance_id uuid references public.item_instances(id) on delete restrict,
 purchased_at timestamptz not null default now(),
 refunded_at timestamptz,
 revoked_at timestamptz,
 metadata jsonb not null default '{}'::jsonb check(jsonb_typeof(metadata)='object'),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(provider,provider_transaction_id)
);
create index if not exists digital_store_purchases_user_idx on public.digital_store_purchases(user_id,created_at desc);
create index if not exists digital_store_purchases_product_idx on public.digital_store_purchases(product_code,status);

create table if not exists public.digital_store_entitlements(
 user_id uuid not null references auth.users(id) on delete cascade,
 product_code text not null references public.digital_store_products(code),
 item_instance_id uuid not null references public.item_instances(id) on delete restrict,
 source_purchase_id uuid not null references public.digital_store_purchases(id) on delete restrict,
 status text not null default 'active' check(status in ('active','revoked')),
 granted_at timestamptz not null default now(),
 revoked_at timestamptz,
 updated_at timestamptz not null default now(),
 primary key(user_id,product_code)
);
create index if not exists digital_store_entitlements_item_idx on public.digital_store_entitlements(item_instance_id);

create table if not exists public.digital_store_provider_events(
 provider text not null check(provider in ('stripe','google_play','app_store')),
 event_id text not null,
 event_type text not null,
 processed boolean not null default false,
 error_code text,
 created_at timestamptz not null default now(),
 processed_at timestamptz,
 primary key(provider,event_id)
);

alter table public.digital_store_products enable row level security;
alter table public.digital_store_purchases enable row level security;
alter table public.digital_store_entitlements enable row level security;
alter table public.digital_store_provider_events enable row level security;
revoke all on public.digital_store_products,public.digital_store_purchases,public.digital_store_entitlements,public.digital_store_provider_events from public,anon,authenticated;
grant select on public.digital_store_products to authenticated;
grant select on public.digital_store_purchases,public.digital_store_entitlements to authenticated;
grant all on public.digital_store_products,public.digital_store_purchases,public.digital_store_entitlements,public.digital_store_provider_events to service_role;

drop policy if exists digital_store_products_read on public.digital_store_products;
create policy digital_store_products_read on public.digital_store_products for select to authenticated using(active=true and release_state in ('test','ready','live'));
drop policy if exists digital_store_purchases_read_own on public.digital_store_purchases;
create policy digital_store_purchases_read_own on public.digital_store_purchases for select to authenticated using((select auth.uid())=user_id);
drop policy if exists digital_store_entitlements_read_own on public.digital_store_entitlements;
create policy digital_store_entitlements_read_own on public.digital_store_entitlements for select to authenticated using((select auth.uid())=user_id);

create or replace function public.digital_store_fulfill_nonconsumable(
 p_user uuid,p_product_code text,p_provider text,p_provider_transaction_id text,p_provider_product_ref text default null,
 p_amount_cents integer default null,p_currency text default null,p_receipt_hash text default null,p_metadata jsonb default '{}'::jsonb
) returns jsonb language plpgsql security definer set search_path='' as $function$
declare
 v_product public.digital_store_products%rowtype;
 v_item public.inventory_items%rowtype;
 v_purchase public.digital_store_purchases%rowtype;
 v_entitlement public.digital_store_entitlements%rowtype;
 v_instance uuid; v_serial bigint;
begin
 if p_user is null or not exists(select 1 from auth.users where id=p_user) then raise exception 'invalid_user'; end if;
 if p_provider not in ('stripe','google_play','app_store','manual_test') then raise exception 'invalid_provider'; end if;
 if length(coalesce(p_provider_transaction_id,''))<4 or length(p_provider_transaction_id)>240 then raise exception 'invalid_transaction'; end if;
 if p_metadata is null or jsonb_typeof(p_metadata)<>'object' then raise exception 'invalid_metadata'; end if;
 select * into v_product from public.digital_store_products where code=p_product_code for update;
 if not found or not v_product.active or v_product.release_state='retired' then raise exception 'product_unavailable'; end if;
 if v_product.product_kind<>'non_consumable' then raise exception 'unsupported_product_kind'; end if;
 select * into v_purchase from public.digital_store_purchases where provider=p_provider and provider_transaction_id=p_provider_transaction_id;
 if found then return jsonb_build_object('ok',v_purchase.status='paid','purchaseId',v_purchase.id,'itemInstanceId',v_purchase.item_instance_id,'status',v_purchase.status,'duplicate',true); end if;
 select * into v_entitlement from public.digital_store_entitlements where user_id=p_user and product_code=p_product_code;
 if found and v_entitlement.status='active' then return jsonb_build_object('ok',true,'purchaseId',v_entitlement.source_purchase_id,'itemInstanceId',v_entitlement.item_instance_id,'status','already_owned','duplicate',true); end if;
 select * into v_item from public.inventory_items where code=v_product.item_code for update;
 if not found or not v_item.active or not v_item.permanent then raise exception 'inventory_item_unavailable'; end if;
 if v_item.max_supply is not null and v_item.minted_count>=v_item.max_supply then raise exception 'supply_exhausted'; end if;
 v_serial:=v_item.minted_count+1;
 update public.inventory_items set minted_count=v_serial where code=v_item.code;
 insert into public.item_instances(item_code,serial_no,owner_id,state,origin,origin_ref,metadata)
 values(v_item.code,v_serial,p_user,'owned','shop_bundle',p_provider||':'||p_provider_transaction_id,
   jsonb_build_object('digital_store',true,'product_code',p_product_code,'provider',p_provider,'real_money',p_provider<>'manual_test','non_resellable',true) || p_metadata)
 returning id into v_instance;
 insert into public.digital_store_purchases(user_id,product_code,provider,provider_transaction_id,provider_product_ref,amount_cents,currency,status,receipt_hash,item_instance_id,metadata)
 values(p_user,p_product_code,p_provider,p_provider_transaction_id,p_provider_product_ref,p_amount_cents,p_currency,'paid',p_receipt_hash,v_instance,p_metadata)
 returning * into v_purchase;
 insert into public.digital_store_entitlements(user_id,product_code,item_instance_id,source_purchase_id,status)
 values(p_user,p_product_code,v_instance,v_purchase.id,'active')
 on conflict(user_id,product_code) do update set item_instance_id=excluded.item_instance_id,source_purchase_id=excluded.source_purchase_id,status='active',revoked_at=null,updated_at=now();
 return jsonb_build_object('ok',true,'purchaseId',v_purchase.id,'itemInstanceId',v_instance,'status','active','duplicate',false);
end $function$;
revoke all on function public.digital_store_fulfill_nonconsumable(uuid,text,text,text,text,integer,text,text,jsonb) from public,anon,authenticated;
grant execute on function public.digital_store_fulfill_nonconsumable(uuid,text,text,text,text,integer,text,text,jsonb) to service_role;

create or replace function public.digital_store_revoke_purchase(p_provider text,p_provider_transaction_id text,p_reason text default 'refund')
returns jsonb language plpgsql security definer set search_path='' as $function$
declare v_purchase public.digital_store_purchases%rowtype;
begin
 select * into v_purchase from public.digital_store_purchases where provider=p_provider and provider_transaction_id=p_provider_transaction_id for update;
 if not found then return jsonb_build_object('ok',true,'found',false); end if;
 if v_purchase.status in ('refunded','revoked') then return jsonb_build_object('ok',true,'found',true,'duplicate',true); end if;
 update public.digital_store_purchases set status=case when p_reason='refund' then 'refunded' else 'revoked' end,
 refunded_at=case when p_reason='refund' then now() else refunded_at end,revoked_at=now(),updated_at=now() where id=v_purchase.id;
 update public.digital_store_entitlements set status='revoked',revoked_at=now(),updated_at=now() where user_id=v_purchase.user_id and product_code=v_purchase.product_code;
 update public.item_instances set state='retired',metadata=coalesce(metadata,'{}'::jsonb)||jsonb_build_object('revoked',true,'revocation_reason',p_reason,'revoked_at',now()) where id=v_purchase.item_instance_id;
 return jsonb_build_object('ok',true,'found',true,'duplicate',false,'itemInstanceId',v_purchase.item_instance_id);
end $function$;
revoke all on function public.digital_store_revoke_purchase(text,text,text) from public,anon,authenticated;
grant execute on function public.digital_store_revoke_purchase(text,text,text) to service_role;

insert into public.digital_store_products(code,game_scope,item_code,name,description,price_cents,currency,active,release_state,no_pay_to_win,stripe_product_id,stripe_price_id,sort_order,metadata)
values
('WORLD_KAIS_ORIGIN_JACKET','world','PREM_WORLD_KAIS_JACKET','Veste Kaïs Origine Premium','Tenue premium permanente. Aucun avantage de puissance.',499,'eur',true,'test',true,'prod_VLLlbKJJKqDqoo','price_1UKf42C3wYXh2i6li6KvYPPj',10,jsonb_build_object('category','outfit')),
('WORLD_MATRIX_AURA','world','PREM_WORLD_MATRIX_AURA','Aura Matrix','Effet visuel premium permanent. Aucun avantage de puissance.',299,'eur',true,'test',true,'prod_VLLlSjcSHsxHLT','price_1UKf4OC3wYXh2i6lggadYALX',20,jsonb_build_object('category','effect')),
('WORLD_BROKEN_RING_EFFECT','world','PREM_WORLD_BROKEN_RING','Effet Cercle Brisé','Effet cosmétique premium permanent.',399,'eur',true,'test',true,'prod_VLLlAuTrCHV0Nj','price_1UKf4QC3wYXh2i6lBT0tGkeJ',30,jsonb_build_object('category','effect')),
('WORLD_EIGHT_DOORS_ARRIVAL','world','PREM_WORLD_EIGHT_DOORS','Arrivée Huit Portes','Animation d’arrivée premium permanente.',599,'eur',true,'test',true,'prod_VLLmQdxK5bf7Nt','price_1UKf4TC3wYXh2i6lbgWL6VMu',40,jsonb_build_object('category','animation')),
('WORLD_REFUGE_CHAMPAGNE_SET','world','PREM_WORLD_REFUGE_CHAMPAGNE','Refuge Champagne','Pack décoratif premium permanent.',799,'eur',true,'test',true,'prod_VLLmVPBr5pjKnu','price_1UKf4VC3wYXh2i6ln9PBTljP',50,jsonb_build_object('category','decoration')),
('CITY_MATRIX_ROAD_THEME','city','PREM_CITY_MATRIX_ROADS','Routes Matrix','Thème premium permanent pour les routes.',199,'eur',true,'test',true,'prod_VLLmIppVBjA9Ni','price_1UKf4XC3wYXh2i6lp6UKfC5G',110,jsonb_build_object('category','road_theme')),
('CITY_CHAMPAGNE_ARCHITECTURE','city','PREM_CITY_CHAMPAGNE_ARCH','Architecture Champagne','Pack premium permanent de façades et architecture.',699,'eur',true,'test',true,'prod_VLLmwd8YUgHT1o','price_1UKf4aC3wYXh2i6lx3JvZPQO',120,jsonb_build_object('category','architecture')),
('CITY_WATERFRONT_PREMIUM','city','PREM_CITY_WATERFRONT','Waterfront Premium','Pack premium permanent d’aménagement des zones d’eau.',899,'eur',true,'test',true,'prod_VLLmyKl1wCxJss','price_1UKf4cC3wYXh2i6le8ftg4Tq',130,jsonb_build_object('category','waterfront')),
('CITY_BROKEN_CIRCLE_MONUMENT','city','PREM_CITY_BROKEN_MONUMENT','Monument Cercle Brisé','Monument décoratif premium permanent.',999,'eur',true,'test',true,'prod_VLLmR8I38omE0p','price_1UKf4eC3wYXh2i6lVzvqvLVC',140,jsonb_build_object('category','monument')),
('CITY_NIGHT_LUXE_THEME','city','PREM_CITY_NIGHT_LUXE','Thème Nuit Luxe','Ambiance nocturne premium permanente.',399,'eur',true,'test',true,'prod_VLLmYDUDdDfbEU','price_1UKf4hC3wYXh2i6lktXBRDaG',150,jsonb_build_object('category','theme'))
on conflict(code) do update set game_scope=excluded.game_scope,item_code=excluded.item_code,name=excluded.name,description=excluded.description,price_cents=excluded.price_cents,currency=excluded.currency,active=excluded.active,release_state=excluded.release_state,no_pay_to_win=true,stripe_product_id=excluded.stripe_product_id,stripe_price_id=excluded.stripe_price_id,sort_order=excluded.sort_order,metadata=excluded.metadata,updated_at=now();

commit;
