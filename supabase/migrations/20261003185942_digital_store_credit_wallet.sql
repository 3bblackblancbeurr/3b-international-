begin;
alter table public.digital_store_products drop constraint digital_store_products_product_kind_check;
alter table public.digital_store_products add constraint digital_store_products_product_kind_check check(product_kind in ('non_consumable','subscription','consumable'));
alter table public.digital_store_products alter column item_code drop not null;
alter table public.digital_store_products add column wallet_asset text check(wallet_asset in ('credits','premium_credits')),
 add column wallet_amount integer check(wallet_amount between 1 and 1000000),
 add column credit_asset text check(credit_asset in ('credits','premium_credits')),
 add column credit_cost integer check(credit_cost between 1 and 1000000),
 add constraint digital_store_wallet_product check(
  (product_kind='consumable' and item_code is null and wallet_asset is not null and wallet_amount is not null)
  or (product_kind<>'consumable' and item_code is not null and wallet_asset is null and wallet_amount is null)),
 add constraint digital_store_credit_price check((credit_asset is null)=(credit_cost is null));
alter table public.digital_store_purchases drop constraint digital_store_purchases_provider_check;
alter table public.digital_store_purchases add constraint digital_store_purchases_provider_check check(provider in ('stripe','google_play','app_store','manual_test','wallet'));
alter table public.digital_store_purchases add column wallet_asset text check(wallet_asset in ('credits','premium_credits')),
 add column wallet_amount integer check(wallet_amount>0);

-- A refunded, already-spent pack creates a debt, never a second grant or earned Coins.
create table public.digital_credit_accounts(
 user_id uuid not null references auth.users(id),asset text not null check(asset in ('credits','premium_credits')),
 balance bigint not null default 0,updated_at timestamptz not null default now(),primary key(user_id,asset));
create table public.digital_credit_ledger(
 id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id),
 asset text not null check(asset in ('credits','premium_credits')),delta bigint not null check(delta<>0),
 kind text not null check(kind in ('purchase','spend','refund')),purchase_id uuid not null references public.digital_store_purchases(id),
 created_at timestamptz not null default now(),unique(purchase_id,asset,kind));
alter table public.digital_credit_accounts enable row level security;
alter table public.digital_credit_ledger enable row level security;
revoke all on public.digital_credit_accounts,public.digital_credit_ledger from public,anon,authenticated;
grant select on public.digital_credit_accounts,public.digital_credit_ledger to authenticated;
grant select,insert,update on public.digital_credit_accounts to service_role;
grant select,insert on public.digital_credit_ledger to service_role;
create policy digital_credit_accounts_own on public.digital_credit_accounts for select to authenticated using((select auth.uid())=user_id);
create policy digital_credit_ledger_own on public.digital_credit_ledger for select to authenticated using((select auth.uid())=user_id);

create function public.digital_store_fulfill_v2(
 p_user uuid,p_product_code text,p_provider text,p_provider_transaction_id text,p_provider_product_ref text default null,
 p_amount_cents integer default null,p_currency text default null,p_receipt_hash text default null,p_metadata jsonb default '{}'
) returns jsonb language plpgsql security definer set search_path='' as $$
declare product public.digital_store_products;purchase public.digital_store_purchases;balance bigint;
begin
 if p_user is null or not exists(select 1 from auth.users where id=p_user) then raise exception 'invalid_user';end if;
 if p_provider not in ('stripe','google_play','app_store','manual_test') or length(coalesce(p_provider_transaction_id,'')) not between 4 and 240 then raise exception 'invalid_transaction';end if;
 perform pg_advisory_xact_lock(hashtextextended('digital-transaction:'||p_provider||':'||p_provider_transaction_id,0));
 perform pg_advisory_xact_lock(hashtextextended('digital-wallet:'||p_user::text,0));
 select * into purchase from public.digital_store_purchases where provider=p_provider and provider_transaction_id=p_provider_transaction_id;
 if found then
  if purchase.user_id<>p_user or purchase.product_code<>p_product_code then raise exception 'transaction_owner_mismatch';end if;
  return jsonb_build_object('ok',purchase.status='paid','purchaseId',purchase.id,'status',purchase.status,'duplicate',true);
 end if;
 select * into product from public.digital_store_products where code=p_product_code for update;
 if not found or not product.active or product.release_state='retired' or not product.no_pay_to_win then raise exception 'product_unavailable';end if;
 if p_amount_cents is distinct from product.price_cents or p_currency is distinct from product.currency or p_receipt_hash is null then raise exception 'invalid_receipt';end if;
 if product.product_kind='non_consumable' then
  return public.digital_store_fulfill_nonconsumable(p_user,p_product_code,p_provider,p_provider_transaction_id,p_provider_product_ref,p_amount_cents,p_currency,p_receipt_hash,p_metadata);
 end if;
 if product.product_kind<>'consumable' then raise exception 'unsupported_product_kind';end if;
 insert into public.digital_store_purchases(user_id,product_code,provider,provider_transaction_id,provider_product_ref,amount_cents,currency,status,receipt_hash,metadata,wallet_asset,wallet_amount)
 values(p_user,p_product_code,p_provider,p_provider_transaction_id,p_provider_product_ref,p_amount_cents,p_currency,'paid',p_receipt_hash,p_metadata,product.wallet_asset,product.wallet_amount) returning * into purchase;
 insert into public.digital_credit_accounts(user_id,asset,balance) values(p_user,product.wallet_asset,product.wallet_amount)
 on conflict(user_id,asset) do update set balance=digital_credit_accounts.balance+excluded.balance,updated_at=now() returning digital_credit_accounts.balance into balance;
 insert into public.digital_credit_ledger(user_id,asset,delta,kind,purchase_id) values(p_user,product.wallet_asset,product.wallet_amount,'purchase',purchase.id);
 return jsonb_build_object('ok',true,'purchaseId',purchase.id,'status','paid','asset',product.wallet_asset,'amount',product.wallet_amount,'balance',balance,'duplicate',false);
end $$;
revoke all on function public.digital_store_fulfill_v2(uuid,text,text,text,text,integer,text,text,jsonb) from public,anon,authenticated;
grant execute on function public.digital_store_fulfill_v2(uuid,text,text,text,text,integer,text,text,jsonb) to service_role;

create or replace function public.digital_store_revoke_purchase(p_provider text,p_provider_transaction_id text,p_reason text default 'refund')
returns jsonb language plpgsql security definer set search_path='' as $$
declare purchase public.digital_store_purchases;
begin
 perform pg_advisory_xact_lock(hashtextextended('digital-transaction:'||p_provider||':'||p_provider_transaction_id,0));
 select * into purchase from public.digital_store_purchases where provider=p_provider and provider_transaction_id=p_provider_transaction_id;
 if not found then return jsonb_build_object('ok',true,'found',false);end if;
 perform pg_advisory_xact_lock(hashtextextended('digital-wallet:'||purchase.user_id::text,0));
 select * into purchase from public.digital_store_purchases where id=purchase.id for update;
 if purchase.status in ('refunded','revoked') then return jsonb_build_object('ok',true,'found',true,'duplicate',true);end if;
 if purchase.status<>'paid' then raise exception 'invalid_purchase_state';end if;
 update public.digital_store_purchases set status=case when p_reason='refund' then 'refunded' else 'revoked' end,refunded_at=case when p_reason='refund' then now() else refunded_at end,revoked_at=now(),updated_at=now() where id=purchase.id;
 if purchase.wallet_asset is not null then
  update public.digital_credit_accounts set balance=balance-purchase.wallet_amount,updated_at=now() where user_id=purchase.user_id and asset=purchase.wallet_asset;
  insert into public.digital_credit_ledger(user_id,asset,delta,kind,purchase_id) values(purchase.user_id,purchase.wallet_asset,-purchase.wallet_amount,'refund',purchase.id);
 else
  update public.digital_store_entitlements set status='revoked',revoked_at=now(),updated_at=now() where source_purchase_id=purchase.id;
  update public.item_instances set state='retired',metadata=coalesce(metadata,'{}'::jsonb)||jsonb_build_object('revoked',true,'revocation_reason',p_reason) where id=purchase.item_instance_id;
 end if;
 return jsonb_build_object('ok',true,'found',true,'duplicate',false);
end $$;

-- Preserve the established inventory minting function; wallet calls are server-only.
do $patch$ declare body text;begin
 body:=pg_get_functiondef('public.digital_store_fulfill_nonconsumable(uuid,text,text,text,text,integer,text,text,jsonb)'::regprocedure);
 body:=replace(body,'''app_store'',''manual_test'')','''app_store'',''manual_test'',''wallet'')');
 execute body;
end $patch$;
create function public.digital_store_spend_credits(p_user uuid,p_product_code text,p_request uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare product public.digital_store_products;purchase public.digital_store_purchases;result jsonb;balance bigint;txn text;
begin
 if p_user is null or p_request is null then raise exception 'invalid_request';end if;
 txn:='wallet:'||p_request::text;
 perform pg_advisory_xact_lock(hashtextextended('digital-transaction:wallet:'||txn,0));
 perform pg_advisory_xact_lock(hashtextextended('digital-wallet:'||p_user::text,0));
 select * into purchase from public.digital_store_purchases where provider='wallet' and provider_transaction_id=txn;
 if found then
  if purchase.user_id<>p_user or purchase.product_code<>p_product_code then raise exception 'transaction_owner_mismatch';end if;
  return jsonb_build_object('ok',purchase.status='paid','duplicate',true);
 end if;
 select * into product from public.digital_store_products where code=p_product_code for update;
 if not found or not product.active or product.release_state<>'live' or product.product_kind<>'non_consumable' or product.credit_cost is null or not product.no_pay_to_win then raise exception 'credit_product_unavailable';end if;
 if exists(select 1 from public.digital_store_entitlements where user_id=p_user and product_code=p_product_code and status='active') then raise exception 'already_owned';end if;
 if exists(select 1 from public.digital_credit_accounts a where a.user_id=p_user and a.balance<0) then raise exception 'wallet_debt';end if;
 select a.balance into balance from public.digital_credit_accounts a where user_id=p_user and asset=product.credit_asset for update;
 if balance is null or balance<product.credit_cost then raise exception 'insufficient_credits';end if;
 result:=public.digital_store_fulfill_nonconsumable(p_user,p_product_code,'wallet',txn,product.code,0,'eur',null,jsonb_build_object('credit_asset',product.credit_asset,'credit_cost',product.credit_cost));
 update public.digital_credit_accounts a set balance=a.balance-product.credit_cost,updated_at=now() where user_id=p_user and asset=product.credit_asset;
 insert into public.digital_credit_ledger(user_id,asset,delta,kind,purchase_id) values(p_user,product.credit_asset,-product.credit_cost,'spend',(result->>'purchaseId')::uuid);
 return result;
end $$;
revoke all on function public.digital_store_spend_credits(uuid,text,uuid) from public,anon,authenticated;
grant execute on function public.digital_store_spend_credits(uuid,text,uuid) to service_role;

insert into public.digital_store_products(code,game_scope,item_code,name,description,product_kind,price_cents,currency,active,release_state,no_pay_to_win,wallet_asset,wallet_amount,sort_order,metadata) values
 ('CITY_CREDITS_500','city',null,'500 Crédits boutique','Crédits réservés aux décorations. Aucun Coin ni XP de construction.','consumable',499,'eur',true,'test',true,'credits',500,210,'{"category":"credits"}'),
 ('CITY_CREDITS_1200','city',null,'1 200 Crédits boutique','Crédits réservés aux décorations. Aucun Coin ni XP de construction.','consumable',999,'eur',true,'test',true,'credits',1200,220,'{"category":"credits"}'),
 ('CITY_PREMIUM_CREDITS_100','city',null,'100 Crédits Premium','Monnaie pour les thèmes et objets Premium facultatifs.','consumable',499,'eur',true,'test',true,'premium_credits',100,230,'{"category":"premium_credits"}'),
 ('CITY_PREMIUM_CREDITS_250','city',null,'250 Crédits Premium','Monnaie pour les thèmes et objets Premium facultatifs.','consumable',999,'eur',true,'test',true,'premium_credits',250,240,'{"category":"premium_credits"}');
update public.digital_store_products set credit_asset='credits',credit_cost=200 where code='CITY_MATRIX_ROAD_THEME';
update public.digital_store_products set credit_asset='credits',credit_cost=400 where code='CITY_NIGHT_LUXE_THEME';
update public.digital_store_products set credit_asset='premium_credits',credit_cost=140 where code='CITY_CHAMPAGNE_ARCHITECTURE';
update public.digital_store_products set credit_asset='premium_credits',credit_cost=180 where code='CITY_WATERFRONT_PREMIUM';
update public.digital_store_products set credit_asset='premium_credits',credit_cost=200 where code='CITY_BROKEN_CIRCLE_MONUMENT';
update public.digital_store_products set stripe_product_id='prod_3B_CITY_CREDITS_500_V1',stripe_price_id='price_1UMXyTC3wYXh2i6lO3srGpPg' where code='CITY_CREDITS_500';
update public.digital_store_products set stripe_product_id='prod_3B_CITY_CREDITS_1200_V1',stripe_price_id='price_1UMXzFC3wYXh2i6lUYn3sxoH' where code='CITY_CREDITS_1200';
update public.digital_store_products set stripe_product_id='prod_3B_CITY_PREMIUM_CREDITS_100_V1',stripe_price_id='price_1UMXzGC3wYXh2i6lS94hEVF3' where code='CITY_PREMIUM_CREDITS_100';
update public.digital_store_products set stripe_product_id='prod_3B_CITY_PREMIUM_CREDITS_250_V1',stripe_price_id='price_1UMXzHC3wYXh2i6lFboHWqyg' where code='CITY_PREMIUM_CREDITS_250';
notify pgrst,'reload schema';
commit;
