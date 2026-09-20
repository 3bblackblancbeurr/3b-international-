begin;

-- 3B permanent-item economy: no seasons, no expiry of owned collectibles.
alter table public.inventory_items
  add column if not exists description text not null default '',
  add column if not exists item_type text not null default 'cosmetic',
  add column if not exists rarity text not null default 'common',
  add column if not exists tradeable boolean not null default true,
  add column if not exists marketable boolean not null default true,
  add column if not exists permanent boolean not null default true,
  add column if not exists stackable boolean not null default false,
  add column if not exists max_supply bigint,
  add column if not exists minted_count bigint not null default 0;

alter table public.inventory_items
  drop constraint if exists inventory_items_item_type_check,
  add constraint inventory_items_item_type_check check (item_type in ('skin','outfit','effect','vehicle','animation','accessory','badge','collectible','passport_cosmetic','world_object','cosmetic')),
  drop constraint if exists inventory_items_rarity_check,
  add constraint inventory_items_rarity_check check (rarity in ('common','uncommon','rare','epic','legendary','mythic','unique')),
  drop constraint if exists inventory_items_permanent_check,
  add constraint inventory_items_permanent_check check (permanent = true),
  drop constraint if exists inventory_items_max_supply_check,
  add constraint inventory_items_max_supply_check check (max_supply is null or max_supply > 0),
  drop constraint if exists inventory_items_minted_count_check,
  add constraint inventory_items_minted_count_check check (minted_count >= 0 and (max_supply is null or minted_count <= max_supply));

create table if not exists public.item_instances (
  id uuid primary key default gen_random_uuid(),
  item_code text not null references public.inventory_items(code),
  serial_no bigint not null check (serial_no > 0),
  owner_id uuid references auth.users(id) on delete set null,
  state text not null default 'owned' check (state in ('owned','listed','trade_locked','retired')),
  equipped_slot text,
  lock_ref uuid,
  origin text not null check (origin in ('milestone','game_reward','achievement','event_reward','passport','shop_bundle','admin_grant','sponsor_event')),
  origin_ref text,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata)='object'),
  minted_at timestamptz not null default now(),
  acquired_at timestamptz not null default now(),
  unique(item_code,serial_no)
);
create index if not exists item_instances_owner_state_idx on public.item_instances(owner_id,state,acquired_at desc);
create index if not exists item_instances_code_idx on public.item_instances(item_code,serial_no);
create index if not exists item_instances_lock_idx on public.item_instances(lock_ref) where lock_ref is not null;

create table if not exists public.item_transfer_history (
  id bigint generated always as identity primary key,
  item_instance_id uuid not null references public.item_instances(id) on delete restrict,
  from_user uuid references auth.users(id) on delete set null,
  to_user uuid references auth.users(id) on delete set null,
  reason text not null check (reason in ('mint','market_sale','trade','gift','retire','restore')),
  price_coins bigint not null default 0 check (price_coins >= 0),
  reference_id uuid,
  created_at timestamptz not null default now()
);
create index if not exists item_transfer_item_time_idx on public.item_transfer_history(item_instance_id,created_at desc);
create index if not exists item_transfer_from_time_idx on public.item_transfer_history(from_user,created_at desc) where from_user is not null;
create index if not exists item_transfer_to_time_idx on public.item_transfer_history(to_user,created_at desc) where to_user is not null;

create table if not exists public.marketplace_listings (
  id uuid primary key default gen_random_uuid(),
  item_instance_id uuid not null references public.item_instances(id) on delete restrict,
  seller_id uuid references auth.users(id) on delete set null,
  buyer_id uuid references auth.users(id) on delete set null,
  price_coins bigint not null check (price_coins between 1 and 10000000),
  status text not null default 'active' check (status in ('active','sold','cancelled')),
  created_at timestamptz not null default now(),
  sold_at timestamptz
);
create unique index if not exists marketplace_one_active_item_idx on public.marketplace_listings(item_instance_id) where status='active';
create index if not exists marketplace_active_price_idx on public.marketplace_listings(status,price_coins,created_at desc);
create index if not exists marketplace_seller_idx on public.marketplace_listings(seller_id,created_at desc) where seller_id is not null;
create index if not exists marketplace_buyer_idx on public.marketplace_listings(buyer_id,sold_at desc) where buyer_id is not null;

create table if not exists public.trade_offers (
  id uuid primary key default gen_random_uuid(),
  proposer_id uuid references auth.users(id) on delete set null,
  recipient_id uuid references auth.users(id) on delete set null,
  status text not null default 'pending' check (status in ('pending','accepted','declined','cancelled','expired')),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now()+interval '7 days'),
  resolved_at timestamptz,
  check (proposer_id is null or recipient_id is null or proposer_id<>recipient_id)
);
create index if not exists trade_offers_proposer_idx on public.trade_offers(proposer_id,status,created_at desc);
create index if not exists trade_offers_recipient_idx on public.trade_offers(recipient_id,status,created_at desc);

create table if not exists public.trade_offer_items (
  trade_id uuid not null references public.trade_offers(id) on delete cascade,
  item_instance_id uuid not null references public.item_instances(id) on delete restrict,
  side text not null check (side in ('offer','request')),
  primary key(trade_id,item_instance_id)
);
create index if not exists trade_offer_items_item_idx on public.trade_offer_items(item_instance_id);

create table if not exists public.subscription_plans (
  code text primary key check (code in ('pass3b','premium3b')),
  name text not null,
  monthly_price_cents integer not null check (monthly_price_cents > 0),
  currency text not null default 'eur' check (currency='eur'),
  description text not null default '',
  benefits jsonb not null default '{}'::jsonb check (jsonb_typeof(benefits)='object'),
  stripe_price_id text,
  google_product_id text,
  apple_product_id text,
  active boolean not null default true,
  sort_order integer not null default 0
);

create table if not exists public.member_entitlements (
  user_id uuid primary key references auth.users(id) on delete cascade,
  plan_code text not null references public.subscription_plans(code),
  provider text not null check (provider in ('stripe','google_play','app_store','manual')),
  status text not null check (status in ('active','trialing','past_due','cancelled','expired')),
  provider_customer_ref text,
  provider_subscription_ref text,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists member_entitlements_provider_subscription_idx on public.member_entitlements(provider,provider_subscription_ref) where provider_subscription_ref is not null;

create table if not exists public.collectible_reward_rules (
  code text primary key,
  item_code text not null references public.inventory_items(code),
  label text not null,
  xp_required bigint not null default 0 check (xp_required >= 0),
  active boolean not null default true,
  sort_order integer not null default 0
);
create table if not exists public.collectible_reward_claims (
  user_id uuid not null references auth.users(id) on delete cascade,
  rule_code text not null references public.collectible_reward_rules(code),
  item_instance_id uuid not null unique references public.item_instances(id) on delete restrict,
  claimed_at timestamptz not null default now(),
  primary key(user_id,rule_code)
);

create table if not exists public.sponsor_placements (
  id uuid primary key default gen_random_uuid(),
  sponsor_name text not null check (length(sponsor_name) between 2 and 120),
  placement text not null check (placement in ('tournament','world_zone','event','app_banner')),
  title text not null check (length(title) between 2 and 160),
  image_url text,
  target_url text,
  starts_at timestamptz,
  ends_at timestamptz,
  active boolean not null default false,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata)='object'),
  created_at timestamptz not null default now(),
  check (ends_at is null or starts_at is null or ends_at>starts_at)
);

create table if not exists public.paid_events (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null check (length(name) between 2 and 160),
  event_type text not null check (event_type in ('tournament','competition','special_content','physical_event')),
  access_type text not null default 'free' check (access_type in ('free','premium','paid')),
  price_cents integer not null default 0 check (price_cents>=0),
  currency text not null default 'eur' check (currency='eur'),
  starts_at timestamptz,
  ends_at timestamptz,
  capacity integer check (capacity is null or capacity>0),
  active boolean not null default false,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata)='object'),
  created_at timestamptz not null default now(),
  check ((access_type='paid' and price_cents>0) or (access_type<>'paid' and price_cents=0)),
  check (ends_at is null or starts_at is null or ends_at>starts_at)
);

insert into public.subscription_plans(code,name,monthly_price_cents,description,benefits,sort_order)
values
('pass3b','Pass 3B',499,'Le confort 3B sans avantage de puissance.',jsonb_build_object(
  'ads_free',true,'passport_animated_themes',true,'wardrobe_presets',3,'market_watchlist',25,
  'profile_frame','pass3b','event_priority_registration',true,'premium_catalog_access',false,
  'gameplay_power_bonus',false,'coin_bonus',false),10),
('premium3b','Premium 3B',799,'Toute la personnalisation premium de l’écosystème 3B, sans pay-to-win.',jsonb_build_object(
  'ads_free',true,'passport_animated_themes',true,'wardrobe_presets',8,'market_watchlist',100,
  'profile_frame','premium3b','event_priority_registration',true,'premium_catalog_access',true,
  'market_price_history_days',90,'advanced_avatar_customization',true,'private_world_room',true,
  'cinematic_filters',true,'gameplay_power_bonus',false,'coin_bonus',false),20)
on conflict(code) do update set name=excluded.name,monthly_price_cents=excluded.monthly_price_cents,
 description=excluded.description,benefits=excluded.benefits,sort_order=excluded.sort_order,active=true;

insert into public.inventory_items(code,name,category,coin_price,active,metadata,description,item_type,rarity,tradeable,marketable,permanent,stackable,max_supply)
values
('AURA_MATRIX_BLUE','Aura Matrix bleue','cosmetic',0,true,'{}'::jsonb,'Aura bleue Matrix permanente pour l’avatar.','effect','rare',true,true,true,false,10000),
('KAIS_ORIGIN_JACKET','Veste Kaïs · Origine','cosmetic',0,true,'{}'::jsonb,'Tenue permanente inspirée de Kaïs et du Cercle Brisé.','outfit','epic',true,true,true,false,5000),
('EFFECT_BROKEN_RING','Effet Cercle Brisé','cosmetic',0,true,'{}'::jsonb,'Effet visuel du Cercle Brisé, numéroté individuellement.','effect','epic',true,true,true,false,2500),
('VEHICLE_1618_NIGHT','Véhicule 16-18 · Nuit','cosmetic',0,true,'{}'::jsonb,'Habillage de véhicule 16-18 nocturne.','vehicle','legendary',true,true,true,false,500),
('ANIM_EIGHT_DOORS','Animation · Huit Portes','cosmetic',0,true,'{}'::jsonb,'Animation permanente des huit portes.','animation','legendary',true,true,true,false,250),
('PASSPORT_FOUNDER_GOLD','Passeport Fondateur · Or','cosmetic',0,true,'{}'::jsonb,'Cosmétique permanent réservé aux activations fondateur du Passeport 3B.','passport_cosmetic','mythic',true,true,true,false,1000),
('RELIC_CIRCLE_001','Relique du Cercle · 001','collectible',0,true,'{}'::jsonb,'Relique mondiale véritablement unique : un seul exemplaire.','collectible','unique',true,true,true,false,1)
on conflict(code) do update set name=excluded.name,description=excluded.description,item_type=excluded.item_type,
 rarity=excluded.rarity,tradeable=excluded.tradeable,marketable=excluded.marketable,permanent=true,max_supply=excluded.max_supply,active=true;

insert into public.collectible_reward_rules(code,item_code,label,xp_required,sort_order)
values
('xp_500_matrix','AURA_MATRIX_BLUE','500 XP · Aura Matrix bleue',500,10),
('xp_1500_kais','KAIS_ORIGIN_JACKET','1 500 XP · Veste Kaïs Origine',1500,20),
('xp_3000_ring','EFFECT_BROKEN_RING','3 000 XP · Effet Cercle Brisé',3000,30),
('xp_6000_vehicle','VEHICLE_1618_NIGHT','6 000 XP · Véhicule 16-18 Nuit',6000,40),
('xp_10000_doors','ANIM_EIGHT_DOORS','10 000 XP · Animation Huit Portes',10000,50)
on conflict(code) do update set item_code=excluded.item_code,label=excluded.label,xp_required=excluded.xp_required,sort_order=excluded.sort_order,active=true;

alter table public.item_instances enable row level security;
alter table public.item_transfer_history enable row level security;
alter table public.marketplace_listings enable row level security;
alter table public.trade_offers enable row level security;
alter table public.trade_offer_items enable row level security;
alter table public.subscription_plans enable row level security;
alter table public.member_entitlements enable row level security;
alter table public.collectible_reward_rules enable row level security;
alter table public.collectible_reward_claims enable row level security;
alter table public.sponsor_placements enable row level security;
alter table public.paid_events enable row level security;

revoke all on public.item_instances,public.item_transfer_history,public.marketplace_listings,public.trade_offers,public.trade_offer_items,
 public.subscription_plans,public.member_entitlements,public.collectible_reward_rules,public.collectible_reward_claims,
 public.sponsor_placements,public.paid_events from public,anon,authenticated;
grant select on public.item_instances,public.item_transfer_history,public.marketplace_listings,public.trade_offers,public.trade_offer_items,
 public.subscription_plans,public.member_entitlements,public.collectible_reward_rules,public.collectible_reward_claims,
 public.sponsor_placements,public.paid_events to authenticated;
grant all on public.item_instances,public.item_transfer_history,public.marketplace_listings,public.trade_offers,public.trade_offer_items,
 public.subscription_plans,public.member_entitlements,public.collectible_reward_rules,public.collectible_reward_claims,
 public.sponsor_placements,public.paid_events to service_role;
grant usage,select on sequence public.item_transfer_history_id_seq to service_role;

drop policy if exists item_instances_read_own on public.item_instances;
create policy item_instances_read_own on public.item_instances for select to authenticated using ((select auth.uid())=owner_id);
drop policy if exists item_transfer_read_own on public.item_transfer_history;
create policy item_transfer_read_own on public.item_transfer_history for select to authenticated using ((select auth.uid())=from_user or (select auth.uid())=to_user);
drop policy if exists marketplace_listing_read_own on public.marketplace_listings;
create policy marketplace_listing_read_own on public.marketplace_listings for select to authenticated using ((select auth.uid())=seller_id or (select auth.uid())=buyer_id);
drop policy if exists trade_offers_read_party on public.trade_offers;
create policy trade_offers_read_party on public.trade_offers for select to authenticated using ((select auth.uid())=proposer_id or (select auth.uid())=recipient_id);
drop policy if exists trade_offer_items_read_party on public.trade_offer_items;
create policy trade_offer_items_read_party on public.trade_offer_items for select to authenticated using (exists(select 1 from public.trade_offers t where t.id=trade_id and ((select auth.uid())=t.proposer_id or (select auth.uid())=t.recipient_id)));
drop policy if exists subscription_plans_read_active on public.subscription_plans;
create policy subscription_plans_read_active on public.subscription_plans for select to authenticated using (active=true);
drop policy if exists member_entitlements_read_own on public.member_entitlements;
create policy member_entitlements_read_own on public.member_entitlements for select to authenticated using ((select auth.uid())=user_id);
drop policy if exists collectible_reward_rules_read_active on public.collectible_reward_rules;
create policy collectible_reward_rules_read_active on public.collectible_reward_rules for select to authenticated using (active=true);
drop policy if exists collectible_reward_claims_read_own on public.collectible_reward_claims;
create policy collectible_reward_claims_read_own on public.collectible_reward_claims for select to authenticated using ((select auth.uid())=user_id);
drop policy if exists sponsor_placements_read_active on public.sponsor_placements;
create policy sponsor_placements_read_active on public.sponsor_placements for select to authenticated using (active=true and (starts_at is null or starts_at<=now()) and (ends_at is null or ends_at>now()));
drop policy if exists paid_events_read_active on public.paid_events;
create policy paid_events_read_active on public.paid_events for select to authenticated using (active=true);

create or replace function public.market_mint_item(p_user uuid,p_item_code text,p_origin text,p_origin_ref text,p_metadata jsonb)
returns uuid language plpgsql security invoker set search_path='' as $$
declare d public.inventory_items; n bigint; new_id uuid;
begin
 if p_user is null then raise exception 'Compte joueur invalide'; end if;
 select * into d from public.inventory_items where code=p_item_code and active=true for update;
 if not found then raise exception 'Objet 3B introuvable'; end if;
 if p_origin not in ('milestone','game_reward','achievement','event_reward','passport','shop_bundle','admin_grant','sponsor_event') then raise exception 'Origine d objet invalide'; end if;
 n=d.minted_count+1;
 if d.max_supply is not null and n>d.max_supply then raise exception 'Stock numérique épuisé'; end if;
 update public.inventory_items set minted_count=n where code=p_item_code;
 insert into public.item_instances(item_code,serial_no,owner_id,origin,origin_ref,metadata)
 values(p_item_code,n,p_user,p_origin,nullif(p_origin_ref,''),coalesce(p_metadata,'{}'::jsonb)) returning id into new_id;
 insert into public.item_transfer_history(item_instance_id,to_user,reason,reference_id) values(new_id,p_user,'mint',new_id);
 return new_id;
end;$$;

create or replace function public.market_list_item(p_user uuid,p_item uuid,p_price bigint)
returns uuid language plpgsql security invoker set search_path='' as $$
declare r record; listing_id uuid;
begin
 if p_price<1 or p_price>10000000 then raise exception 'Prix invalide'; end if;
 select i.id,i.state,d.marketable,d.tradeable into r
 from public.item_instances i join public.inventory_items d on d.code=i.item_code
 where i.id=p_item and i.owner_id=p_user for update of i;
 if not found then raise exception 'Objet introuvable'; end if;
 if r.state<>'owned' or not r.marketable or not r.tradeable then raise exception 'Objet indisponible pour la revente'; end if;
 insert into public.marketplace_listings(item_instance_id,seller_id,price_coins) values(p_item,p_user,p_price) returning id into listing_id;
 update public.item_instances set state='listed',lock_ref=listing_id,equipped_slot=null where id=p_item;
 return listing_id;
end;$$;

create or replace function public.market_cancel_listing(p_user uuid,p_listing uuid)
returns boolean language plpgsql security invoker set search_path='' as $$
declare l public.marketplace_listings;
begin
 select * into l from public.marketplace_listings where id=p_listing and seller_id=p_user for update;
 if not found or l.status<>'active' then return false; end if;
 update public.marketplace_listings set status='cancelled' where id=p_listing;
 update public.item_instances set state='owned',lock_ref=null where id=l.item_instance_id and owner_id=p_user and state='listed' and lock_ref=p_listing;
 return true;
end;$$;

create or replace function public.market_buy_listing(p_buyer uuid,p_listing uuid)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare l public.marketplace_listings; i public.item_instances; buyer_points bigint; seller_points bigint;
begin
 select * into l from public.marketplace_listings where id=p_listing for update;
 if not found or l.status<>'active' or l.seller_id is null then raise exception 'Annonce indisponible'; end if;
 if l.seller_id=p_buyer then raise exception 'Tu possèdes déjà cet objet'; end if;
 select * into i from public.item_instances where id=l.item_instance_id for update;
 if not found or i.owner_id<>l.seller_id or i.state<>'listed' or i.lock_ref<>p_listing then raise exception 'Objet indisponible'; end if;
 perform 1 from public.member_profiles where user_id in (p_buyer,l.seller_id) order by user_id for update;
 select points into buyer_points from public.member_profiles where user_id=p_buyer;
 select points into seller_points from public.member_profiles where user_id=l.seller_id;
 if buyer_points is null or seller_points is null then raise exception 'Compte membre introuvable'; end if;
 if buyer_points<l.price_coins then raise exception 'Solde Coins 3B insuffisant'; end if;
 update public.member_profiles set points=points-l.price_coins where user_id=p_buyer;
 update public.member_profiles set points=points+l.price_coins where user_id=l.seller_id;
 insert into public.member_ledger(user_id,event_key,source,label,xp,points)
 values(p_buyer,p_buyer||':market:buy:'||p_listing,'market','Achat Marché 3B · '||right(p_listing::text,8),0,-l.price_coins::integer)
 on conflict(event_key) do nothing;
 insert into public.member_ledger(user_id,event_key,source,label,xp,points)
 values(l.seller_id,l.seller_id||':market:sale:'||p_listing,'market','Vente Marché 3B · '||right(p_listing::text,8),0,l.price_coins::integer)
 on conflict(event_key) do nothing;
 update public.item_instances set owner_id=p_buyer,state='owned',lock_ref=null,equipped_slot=null,acquired_at=now() where id=i.id;
 update public.marketplace_listings set status='sold',buyer_id=p_buyer,sold_at=now() where id=p_listing;
 insert into public.item_transfer_history(item_instance_id,from_user,to_user,reason,price_coins,reference_id)
 values(i.id,l.seller_id,p_buyer,'market_sale',l.price_coins,p_listing);
 return jsonb_build_object('listing',p_listing,'item',i.id,'price',l.price_coins,'seller',l.seller_id);
end;$$;

create or replace function public.market_equip_item(p_user uuid,p_item uuid,p_slot text)
returns boolean language plpgsql security invoker set search_path='' as $$
declare s text;
begin
 s=nullif(trim(coalesce(p_slot,'')),'');
 if s is not null and s not in ('outfit','skin','effect','vehicle','animation','accessory','badge','passport','trail','aura') then raise exception 'Emplacement invalide'; end if;
 perform 1 from public.item_instances where id=p_item and owner_id=p_user and state='owned' for update;
 if not found then raise exception 'Objet indisponible'; end if;
 if s is not null then update public.item_instances set equipped_slot=null where owner_id=p_user and equipped_slot=s and id<>p_item; end if;
 update public.item_instances set equipped_slot=s where id=p_item;
 return true;
end;$$;

create or replace function public.market_create_trade(p_user uuid,p_recipient uuid,p_offer uuid[],p_request uuid[])
returns uuid language plpgsql security invoker set search_path='' as $$
declare trade_id uuid; n integer; expected integer;
begin
 if p_recipient is null or p_recipient=p_user then raise exception 'Destinataire invalide'; end if;
 if not exists(select 1 from public.member_profiles where user_id=p_recipient) then raise exception 'Membre introuvable'; end if;
 if coalesce(cardinality(p_offer),0)<1 or coalesce(cardinality(p_request),0)<1 or cardinality(p_offer)>5 or cardinality(p_request)>5 then raise exception 'Un échange contient de 1 à 5 objets de chaque côté'; end if;
 if exists(select 1 from unnest(p_offer||p_request) x group by x having count(*)>1) then raise exception 'Un objet est présent plusieurs fois'; end if;
 perform 1 from public.item_instances where id=any(p_offer||p_request) order by id for update;
 expected=cardinality(p_offer);
 select count(*) into n from public.item_instances i join public.inventory_items d on d.code=i.item_code where i.id=any(p_offer) and i.owner_id=p_user and i.state='owned' and d.tradeable=true;
 if n<>expected then raise exception 'Un objet proposé n est plus disponible'; end if;
 expected=cardinality(p_request);
 select count(*) into n from public.item_instances i join public.inventory_items d on d.code=i.item_code where i.id=any(p_request) and i.owner_id=p_recipient and i.state='owned' and d.tradeable=true;
 if n<>expected then raise exception 'Un objet demandé n est plus disponible'; end if;
 insert into public.trade_offers(proposer_id,recipient_id) values(p_user,p_recipient) returning id into trade_id;
 insert into public.trade_offer_items(trade_id,item_instance_id,side) select trade_id,x,'offer' from unnest(p_offer) x;
 insert into public.trade_offer_items(trade_id,item_instance_id,side) select trade_id,x,'request' from unnest(p_request) x;
 update public.item_instances set state='trade_locked',lock_ref=trade_id,equipped_slot=null where id=any(p_offer||p_request);
 return trade_id;
end;$$;

create or replace function public.market_respond_trade(p_user uuid,p_trade uuid,p_accept boolean)
returns boolean language plpgsql security invoker set search_path='' as $$
declare t public.trade_offers; offer_count integer; request_count integer; ok_count integer;
begin
 select * into t from public.trade_offers where id=p_trade for update;
 if not found or t.status<>'pending' or t.recipient_id<>p_user then raise exception 'Échange indisponible'; end if;
 if t.expires_at<=now() then
   update public.trade_offers set status='expired',resolved_at=now() where id=p_trade;
   update public.item_instances set state='owned',lock_ref=null where lock_ref=p_trade and state='trade_locked';
   return false;
 end if;
 if not p_accept then
   update public.trade_offers set status='declined',resolved_at=now() where id=p_trade;
   update public.item_instances set state='owned',lock_ref=null where lock_ref=p_trade and state='trade_locked';
   return true;
 end if;
 perform 1 from public.item_instances i join public.trade_offer_items ti on ti.item_instance_id=i.id where ti.trade_id=p_trade order by i.id for update of i;
 select count(*) filter(where side='offer'),count(*) filter(where side='request') into offer_count,request_count from public.trade_offer_items where trade_id=p_trade;
 select count(*) into ok_count from public.trade_offer_items ti join public.item_instances i on i.id=ti.item_instance_id
 where ti.trade_id=p_trade and i.state='trade_locked' and i.lock_ref=p_trade and ((ti.side='offer' and i.owner_id=t.proposer_id) or (ti.side='request' and i.owner_id=t.recipient_id));
 if ok_count<>offer_count+request_count then raise exception 'Un objet de l échange a changé'; end if;
 insert into public.item_transfer_history(item_instance_id,from_user,to_user,reason,reference_id)
 select ti.item_instance_id,case when ti.side='offer' then t.proposer_id else t.recipient_id end,
        case when ti.side='offer' then t.recipient_id else t.proposer_id end,'trade',p_trade
 from public.trade_offer_items ti where ti.trade_id=p_trade;
 update public.item_instances i set owner_id=case when ti.side='offer' then t.recipient_id else t.proposer_id end,
   state='owned',lock_ref=null,equipped_slot=null,acquired_at=now()
 from public.trade_offer_items ti where ti.trade_id=p_trade and ti.item_instance_id=i.id;
 update public.trade_offers set status='accepted',resolved_at=now() where id=p_trade;
 return true;
end;$$;

create or replace function public.market_cancel_trade(p_user uuid,p_trade uuid)
returns boolean language plpgsql security invoker set search_path='' as $$
declare t public.trade_offers;
begin
 select * into t from public.trade_offers where id=p_trade and proposer_id=p_user for update;
 if not found or t.status<>'pending' then return false; end if;
 update public.trade_offers set status='cancelled',resolved_at=now() where id=p_trade;
 update public.item_instances set state='owned',lock_ref=null where lock_ref=p_trade and state='trade_locked';
 return true;
end;$$;

create or replace function public.market_claim_reward(p_user uuid,p_rule text)
returns uuid language plpgsql security invoker set search_path='' as $$
declare r public.collectible_reward_rules; current_xp bigint; new_item uuid;
begin
 select * into r from public.collectible_reward_rules where code=p_rule and active=true;
 if not found then raise exception 'Récompense inconnue'; end if;
 select xp into current_xp from public.member_profiles where user_id=p_user for update;
 if current_xp is null then raise exception 'Compte membre introuvable'; end if;
 if current_xp<r.xp_required then raise exception 'XP insuffisante'; end if;
 if exists(select 1 from public.collectible_reward_claims where user_id=p_user and rule_code=p_rule) then raise exception 'Récompense déjà récupérée'; end if;
 new_item=public.market_mint_item(p_user,r.item_code,'milestone',p_rule,jsonb_build_object('xp_required',r.xp_required));
 insert into public.collectible_reward_claims(user_id,rule_code,item_instance_id) values(p_user,p_rule,new_item);
 return new_item;
end;$$;

revoke all on function public.market_mint_item(uuid,text,text,text,jsonb),public.market_list_item(uuid,uuid,bigint),
 public.market_cancel_listing(uuid,uuid),public.market_buy_listing(uuid,uuid),public.market_equip_item(uuid,uuid,text),
 public.market_create_trade(uuid,uuid,uuid[],uuid[]),public.market_respond_trade(uuid,uuid,boolean),
 public.market_cancel_trade(uuid,uuid),public.market_claim_reward(uuid,text) from public,anon,authenticated;
grant execute on function public.market_mint_item(uuid,text,text,text,jsonb),public.market_list_item(uuid,uuid,bigint),
 public.market_cancel_listing(uuid,uuid),public.market_buy_listing(uuid,uuid),public.market_equip_item(uuid,uuid,text),
 public.market_create_trade(uuid,uuid,uuid[],uuid[]),public.market_respond_trade(uuid,uuid,boolean),
 public.market_cancel_trade(uuid,uuid),public.market_claim_reward(uuid,text) to service_role;

commit;
