-- Nosbloc 3B V2 — guarded creator economy
-- Schema and read paths are production-ready; live payments/payouts remain disabled by runtime_config.

create table if not exists public.nosbloc_products (
  product_id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.nosbloc_creator_profiles(user_id) on delete cascade,
  project_id uuid references public.nosbloc_projects(project_id) on delete cascade,
  title text not null check (char_length(title) between 3 and 120),
  product_type text not null check (product_type in ('access','asset','cosmetic','expansion','service')),
  description text not null default '' check (char_length(description) <= 1000),
  price_cents bigint not null default 0 check (price_cents >= 0),
  currency char(3) not null default 'EUR' check (currency ~ '^[A-Z]{3}$'),
  status text not null default 'draft' check (status in ('draft','review','active','paused','archived')),
  rights_confirmed boolean not null default false,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata)='object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists nosbloc_products_creator_idx
  on public.nosbloc_products(creator_id,status,updated_at desc);
create index if not exists nosbloc_products_project_idx
  on public.nosbloc_products(project_id) where project_id is not null;

create table if not exists public.nosbloc_orders (
  order_id uuid primary key default gen_random_uuid(),
  buyer_id uuid not null references auth.users(id) on delete restrict,
  product_id uuid not null references public.nosbloc_products(product_id) on delete restrict,
  project_id uuid references public.nosbloc_projects(project_id) on delete restrict,
  gross_amount_cents bigint not null check (gross_amount_cents >= 0),
  currency char(3) not null default 'EUR' check (currency ~ '^[A-Z]{3}$'),
  provider text not null default 'stripe',
  provider_checkout_ref text,
  provider_payment_ref text,
  status text not null default 'pending'
    check (status in ('pending','paid','failed','cancelled','refunded','partially_refunded','disputed')),
  idempotency_key uuid not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists nosbloc_orders_buyer_idx on public.nosbloc_orders(buyer_id,created_at desc);
create index if not exists nosbloc_orders_product_idx on public.nosbloc_orders(product_id,created_at desc);
create index if not exists nosbloc_orders_project_idx on public.nosbloc_orders(project_id) where project_id is not null;

create table if not exists public.nosbloc_entitlements (
  entitlement_id uuid primary key default gen_random_uuid(),
  buyer_id uuid not null references auth.users(id) on delete cascade,
  order_id uuid not null references public.nosbloc_orders(order_id) on delete cascade,
  product_id uuid not null references public.nosbloc_products(product_id) on delete restrict,
  status text not null default 'active' check (status in ('active','revoked','refunded')),
  granted_at timestamptz not null default now(),
  revoked_at timestamptz,
  unique(buyer_id,product_id,order_id)
);
create index if not exists nosbloc_entitlements_buyer_idx on public.nosbloc_entitlements(buyer_id,status);
create index if not exists nosbloc_entitlements_order_idx on public.nosbloc_entitlements(order_id);
create index if not exists nosbloc_entitlements_product_idx on public.nosbloc_entitlements(product_id);

create table if not exists public.nosbloc_ledger_entries (
  entry_id uuid primary key default gen_random_uuid(),
  transaction_id uuid not null,
  account_user_id uuid references auth.users(id) on delete restrict,
  project_id uuid references public.nosbloc_projects(project_id) on delete restrict,
  order_id uuid references public.nosbloc_orders(order_id) on delete restrict,
  entry_type text not null check (entry_type in (
    'sale_gross','tax','processor_fee','platform_fee','creator_revenue',
    'refund','chargeback','payout_hold','payout_release','payout'
  )),
  direction text not null check (direction in ('debit','credit')),
  amount_cents bigint not null check (amount_cents >= 0),
  currency char(3) not null default 'EUR' check (currency ~ '^[A-Z]{3}$'),
  status text not null default 'pending' check (status in ('pending','held','available','reversed','paid')),
  available_at timestamptz,
  source_event_id text,
  idempotency_key uuid not null unique,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata)='object'),
  created_at timestamptz not null default now()
);
create index if not exists nosbloc_ledger_user_idx on public.nosbloc_ledger_entries(account_user_id,created_at desc);
create index if not exists nosbloc_ledger_tx_idx on public.nosbloc_ledger_entries(transaction_id);
create index if not exists nosbloc_ledger_project_idx on public.nosbloc_ledger_entries(project_id) where project_id is not null;
create index if not exists nosbloc_ledger_order_idx on public.nosbloc_ledger_entries(order_id) where order_id is not null;

create table if not exists public.nosbloc_refund_requests (
  refund_request_id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.nosbloc_orders(order_id) on delete restrict,
  requester_id uuid not null references auth.users(id) on delete restrict,
  amount_cents bigint not null check (amount_cents > 0),
  reason text not null check (char_length(reason) between 3 and 500),
  status text not null default 'requested'
    check (status in ('requested','review','approved','rejected','processing','refunded','failed')),
  idempotency_key uuid not null unique,
  created_at timestamptz not null default now(),
  decided_at timestamptz
);
create index if not exists nosbloc_refunds_requester_idx on public.nosbloc_refund_requests(requester_id,created_at desc);
create index if not exists nosbloc_refunds_order_idx on public.nosbloc_refund_requests(order_id);

create table if not exists public.nosbloc_payout_accounts (
  user_id uuid primary key references public.nosbloc_creator_profiles(user_id) on delete cascade,
  provider text,
  provider_account_ref text,
  kyc_status text not null default 'not_started'
    check (kyc_status in ('not_started','pending','verified','rejected','expired')),
  tax_status text not null default 'incomplete'
    check (tax_status in ('incomplete','pending','complete','rejected')),
  payouts_enabled boolean not null default false,
  minimum_payout_cents bigint not null default 10000 check (minimum_payout_cents >= 1000),
  updated_at timestamptz not null default now(),
  check (payouts_enabled=false or (kyc_status='verified' and tax_status='complete'))
);

create table if not exists public.nosbloc_payout_requests (
  payout_id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.nosbloc_creator_profiles(user_id) on delete restrict,
  amount_cents bigint not null check (amount_cents >= 1000),
  currency char(3) not null default 'EUR',
  status text not null default 'blocked'
    check (status in ('blocked','requested','review','approved','processing','paid','failed','cancelled')),
  risk_review_required boolean not null default true,
  provider_reference text,
  idempotency_key uuid not null unique,
  requested_at timestamptz not null default now(),
  processed_at timestamptz,
  failure_reason text
);
create index if not exists nosbloc_payout_requests_user_idx
  on public.nosbloc_payout_requests(user_id,requested_at desc);

alter table public.nosbloc_products enable row level security;
alter table public.nosbloc_orders enable row level security;
alter table public.nosbloc_entitlements enable row level security;
alter table public.nosbloc_ledger_entries enable row level security;
alter table public.nosbloc_refund_requests enable row level security;
alter table public.nosbloc_payout_accounts enable row level security;
alter table public.nosbloc_payout_requests enable row level security;

revoke all on public.nosbloc_products from public,anon,authenticated;
revoke all on public.nosbloc_orders from public,anon,authenticated;
revoke all on public.nosbloc_entitlements from public,anon,authenticated;
revoke all on public.nosbloc_ledger_entries from public,anon,authenticated;
revoke all on public.nosbloc_refund_requests from public,anon,authenticated;
revoke all on public.nosbloc_payout_accounts from public,anon,authenticated;
revoke all on public.nosbloc_payout_requests from public,anon,authenticated;

grant select on public.nosbloc_products to authenticated;
grant select on public.nosbloc_orders to authenticated;
grant select on public.nosbloc_entitlements to authenticated;
grant select on public.nosbloc_ledger_entries to authenticated;
grant select on public.nosbloc_refund_requests to authenticated;
grant select on public.nosbloc_payout_accounts to authenticated;
grant select on public.nosbloc_payout_requests to authenticated;

drop policy if exists nosbloc_products_read on public.nosbloc_products;
create policy nosbloc_products_read on public.nosbloc_products
for select to authenticated using (
  creator_id=(select auth.uid())
  or (
    status='active' and rights_confirmed=true
    and exists(select 1 from public.nosbloc_runtime_config where id=true and discover_enabled=true)
  )
);

drop policy if exists nosbloc_orders_read on public.nosbloc_orders;
create policy nosbloc_orders_read on public.nosbloc_orders
for select to authenticated using (
  buyer_id=(select auth.uid())
  or exists(
    select 1 from public.nosbloc_products p
    where p.product_id=nosbloc_orders.product_id and p.creator_id=(select auth.uid())
  )
);

drop policy if exists nosbloc_entitlements_read on public.nosbloc_entitlements;
create policy nosbloc_entitlements_read on public.nosbloc_entitlements
for select to authenticated using (buyer_id=(select auth.uid()));

drop policy if exists nosbloc_ledger_self_read on public.nosbloc_ledger_entries;
create policy nosbloc_ledger_self_read on public.nosbloc_ledger_entries
for select to authenticated using (account_user_id=(select auth.uid()));

drop policy if exists nosbloc_refunds_read on public.nosbloc_refund_requests;
create policy nosbloc_refunds_read on public.nosbloc_refund_requests
for select to authenticated using (
  requester_id=(select auth.uid())
  or exists(
    select 1 from public.nosbloc_orders o
    join public.nosbloc_products p on p.product_id=o.product_id
    where o.order_id=nosbloc_refund_requests.order_id and p.creator_id=(select auth.uid())
  )
);

drop policy if exists nosbloc_payout_account_read on public.nosbloc_payout_accounts;
create policy nosbloc_payout_account_read on public.nosbloc_payout_accounts
for select to authenticated using (user_id=(select auth.uid()));

drop policy if exists nosbloc_payout_request_read on public.nosbloc_payout_requests;
create policy nosbloc_payout_request_read on public.nosbloc_payout_requests
for select to authenticated using (user_id=(select auth.uid()));

create or replace function nosbloc_private.block_ledger_mutation()
returns trigger language plpgsql security invoker
set search_path = pg_catalog, public
as $$
begin
  raise exception 'nosbloc_ledger_immutable';
end
$$;
revoke all on function nosbloc_private.block_ledger_mutation() from public,anon,authenticated;

drop trigger if exists nosbloc_ledger_immutable on public.nosbloc_ledger_entries;
create trigger nosbloc_ledger_immutable
before update or delete on public.nosbloc_ledger_entries
for each row execute function nosbloc_private.block_ledger_mutation();

create or replace view public.nosbloc_wallet_balances
with (security_invoker=true)
as
select
  account_user_id as user_id,
  currency,
  coalesce(sum(case
    when status in('available','paid') and direction='credit' then amount_cents
    when status in('available','paid') and direction='debit' then -amount_cents
    else 0 end),0)::bigint as available_cents,
  coalesce(sum(case
    when status in('pending','held') and direction='credit' then amount_cents
    when status in('pending','held') and direction='debit' then -amount_cents
    else 0 end),0)::bigint as pending_cents
from public.nosbloc_ledger_entries
where account_user_id is not null
group by account_user_id,currency;

revoke all on public.nosbloc_wallet_balances from public,anon,authenticated;
grant select on public.nosbloc_wallet_balances to authenticated;

create or replace function nosbloc_private.create_product(
  p_project uuid,p_title text,p_type text,p_description text,p_price_cents bigint,p_currency text,p_idempotency uuid
) returns jsonb
language plpgsql volatile security definer
set search_path=pg_catalog,public,auth,nosbloc_private,pg_temp
as $$
declare
  v_uid uuid;
  v_product uuid;
begin
  perform nosbloc_private.guard();
  v_uid:=nosbloc_private.require_user();
  if p_project is not null and not exists(
    select 1 from public.nosbloc_projects where project_id=p_project and owner_id=v_uid
  ) then raise exception 'project_owner_required'; end if;
  if p_type not in('access','asset','cosmetic','expansion','service')
     or char_length(trim(coalesce(p_title,'')))<3
     or p_price_cents<0
     or upper(coalesce(p_currency,'EUR'))<>'EUR' then
    raise exception 'invalid_product';
  end if;

  insert into public.nosbloc_products(
    creator_id,project_id,title,product_type,description,price_cents,currency,status,rights_confirmed,
    metadata
  ) values(
    v_uid,p_project,left(trim(p_title),120),p_type,left(coalesce(p_description,''),1000),
    p_price_cents,'EUR','draft',false,jsonb_build_object('createIdempotency',p_idempotency)
  ) returning product_id into v_product;

  insert into public.nosbloc_audit_log(actor_id,project_id,event_type,event_id,idempotency_key)
  values(v_uid,p_project,'product_created',v_product::text,p_idempotency)
  on conflict(idempotency_key) do nothing;

  return jsonb_build_object('ok',true,'productId',v_product,'status','draft');
end
$$;

create or replace function nosbloc_private.update_product(
  p_product uuid,p_title text,p_description text,p_price_cents bigint,p_rights_confirmed boolean,p_idempotency uuid
) returns jsonb
language plpgsql volatile security definer
set search_path=pg_catalog,public,auth,nosbloc_private,pg_temp
as $$
declare
  v_uid uuid;
  v_project uuid;
begin
  perform nosbloc_private.guard();
  v_uid:=nosbloc_private.require_user();
  select project_id into v_project from public.nosbloc_products
  where product_id=p_product and creator_id=v_uid and status in('draft','review','paused','archived')
  for update;
  if not found then raise exception 'product_locked'; end if;
  if char_length(trim(coalesce(p_title,'')))<3 or p_price_cents<0 then raise exception 'invalid_product'; end if;

  update public.nosbloc_products set
    title=left(trim(p_title),120),description=left(coalesce(p_description,''),1000),
    price_cents=p_price_cents,rights_confirmed=coalesce(p_rights_confirmed,false),
    status=case when status='review' then 'draft' else status end,updated_at=now()
  where product_id=p_product;

  insert into public.nosbloc_audit_log(actor_id,project_id,event_type,event_id,idempotency_key)
  values(v_uid,v_project,'product_updated',p_product::text,p_idempotency)
  on conflict(idempotency_key) do nothing;
  return jsonb_build_object('ok',true,'productId',p_product,'status','draft');
end
$$;

create or replace function nosbloc_private.submit_product(
  p_product uuid,p_idempotency uuid
) returns jsonb
language plpgsql volatile security definer
set search_path=pg_catalog,public,auth,nosbloc_private,pg_temp
as $$
declare
  v_uid uuid;
  v_project uuid;
begin
  perform nosbloc_private.guard();
  v_uid:=nosbloc_private.require_user();
  select project_id into v_project from public.nosbloc_products
  where product_id=p_product and creator_id=v_uid and status='draft' and rights_confirmed=true
  for update;
  if not found then raise exception 'product_not_ready'; end if;
  if v_project is not null and not exists(
    select 1 from public.nosbloc_projects where project_id=v_project and status='published'
  ) then raise exception 'project_must_be_published'; end if;

  update public.nosbloc_products set status='review',updated_at=now() where product_id=p_product;
  insert into public.nosbloc_audit_log(actor_id,project_id,event_type,event_id,idempotency_key)
  values(v_uid,v_project,'product_review_requested',p_product::text,p_idempotency)
  on conflict(idempotency_key) do nothing;
  return jsonb_build_object('ok',true,'productId',p_product,'status','review','paymentsLocked',true);
end
$$;

create or replace function nosbloc_private.request_refund(
  p_order uuid,p_amount_cents bigint,p_reason text,p_idempotency uuid
) returns jsonb
language plpgsql volatile security definer
set search_path=pg_catalog,public,auth,nosbloc_private,pg_temp
as $$
declare
  v_uid uuid;
  v_max bigint;
  v_refund uuid;
begin
  perform nosbloc_private.guard();
  v_uid:=nosbloc_private.require_user();
  select gross_amount_cents into v_max
  from public.nosbloc_orders
  where order_id=p_order and buyer_id=v_uid and status in('paid','partially_refunded');
  if v_max is null or p_amount_cents<=0 or p_amount_cents>v_max or char_length(trim(coalesce(p_reason,'')))<3 then
    raise exception 'refund_invalid';
  end if;
  insert into public.nosbloc_refund_requests(order_id,requester_id,amount_cents,reason,idempotency_key)
  values(p_order,v_uid,p_amount_cents,left(trim(p_reason),500),p_idempotency)
  returning refund_request_id into v_refund;
  return jsonb_build_object('ok',true,'refundRequestId',v_refund,'status','requested');
end
$$;

create or replace function nosbloc_private.request_payout(
  p_amount_cents bigint,p_idempotency uuid
) returns jsonb
language plpgsql volatile security definer
set search_path=pg_catalog,public,auth,nosbloc_private,pg_temp
as $$
declare
  v_uid uuid;
  v_account public.nosbloc_payout_accounts;
  v_available bigint := 0;
  v_payout uuid;
begin
  perform nosbloc_private.guard();
  v_uid:=nosbloc_private.require_user();
  if not exists(
    select 1 from public.nosbloc_runtime_config
    where id=true and payouts_enabled=true and payments_enabled=true
  ) then raise exception 'payouts_disabled'; end if;

  select * into v_account from public.nosbloc_payout_accounts
  where user_id=v_uid and payouts_enabled=true and kyc_status='verified' and tax_status='complete';
  if not found then raise exception 'payout_account_not_ready'; end if;

  select coalesce(available_cents,0) into v_available
  from public.nosbloc_wallet_balances where user_id=v_uid and currency='EUR';
  if p_amount_cents<v_account.minimum_payout_cents or p_amount_cents>coalesce(v_available,0) then
    raise exception 'payout_amount_invalid';
  end if;

  insert into public.nosbloc_payout_requests(
    user_id,amount_cents,currency,status,risk_review_required,idempotency_key
  ) values(v_uid,p_amount_cents,'EUR','requested',true,p_idempotency)
  returning payout_id into v_payout;

  return jsonb_build_object('ok',true,'payoutId',v_payout,'status','requested');
end
$$;

create or replace function nosbloc_private.finance_snapshot()
returns jsonb
language plpgsql stable security definer
set search_path=pg_catalog,public,auth,nosbloc_private,pg_temp
as $$
declare
  v_uid uuid;
begin
  perform nosbloc_private.guard();
  v_uid:=nosbloc_private.require_user();
  return jsonb_build_object(
    'ok',true,
    'runtime',(select jsonb_build_object(
      'paymentsEnabled',payments_enabled,'payoutsEnabled',payouts_enabled,'discoverEnabled',discover_enabled
    ) from public.nosbloc_runtime_config where id=true),
    'wallet',coalesce((
      select jsonb_build_object('currency',currency,'availableCents',available_cents,'pendingCents',pending_cents)
      from public.nosbloc_wallet_balances where user_id=v_uid and currency='EUR'
    ),jsonb_build_object('currency','EUR','availableCents',0,'pendingCents',0)),
    'payoutAccount',(select to_jsonb(p) - 'provider_account_ref' from public.nosbloc_payout_accounts p where user_id=v_uid),
    'payoutRequests',coalesce((
      select jsonb_agg(jsonb_build_object(
        'id',payout_id,'amountCents',amount_cents,'currency',currency,'status',status,
        'requestedAt',requested_at,'processedAt',processed_at,'failureReason',failure_reason
      ) order by requested_at desc)
      from (select * from public.nosbloc_payout_requests where user_id=v_uid order by requested_at desc limit 50) x
    ),'[]'::jsonb),
    'ledger',coalesce((
      select jsonb_agg(jsonb_build_object(
        'id',entry_id,'transactionId',transaction_id,'projectId',project_id,'orderId',order_id,
        'type',entry_type,'direction',direction,'amountCents',amount_cents,'currency',currency,
        'status',status,'availableAt',available_at,'createdAt',created_at
      ) order by created_at desc)
      from (select * from public.nosbloc_ledger_entries where account_user_id=v_uid order by created_at desc limit 100) x
    ),'[]'::jsonb),
    'products',coalesce((
      select jsonb_agg(jsonb_build_object(
        'id',product_id,'projectId',project_id,'title',title,'productType',product_type,
        'description',description,'priceCents',price_cents,'currency',currency,'status',status,
        'rightsConfirmed',rights_confirmed,'updatedAt',updated_at
      ) order by updated_at desc)
      from public.nosbloc_products where creator_id=v_uid
    ),'[]'::jsonb),
    'sales',coalesce((
      select jsonb_agg(jsonb_build_object(
        'id',o.order_id,'productId',o.product_id,'projectId',o.project_id,
        'grossAmountCents',o.gross_amount_cents,'currency',o.currency,'status',o.status,'createdAt',o.created_at
      ) order by o.created_at desc)
      from public.nosbloc_orders o join public.nosbloc_products p on p.product_id=o.product_id
      where p.creator_id=v_uid
    ),'[]'::jsonb),
    'refunds',coalesce((
      select jsonb_agg(jsonb_build_object(
        'id',r.refund_request_id,'orderId',r.order_id,'amountCents',r.amount_cents,
        'reason',r.reason,'status',r.status,'createdAt',r.created_at
      ) order by r.created_at desc)
      from public.nosbloc_refund_requests r
      where r.requester_id=v_uid
         or exists(
           select 1 from public.nosbloc_orders o join public.nosbloc_products p on p.product_id=o.product_id
           where o.order_id=r.order_id and p.creator_id=v_uid
         )
    ),'[]'::jsonb)
  );
end
$$;

create or replace function public.nosbloc_create_product_api(
  p_project uuid,p_title text,p_type text,p_description text,p_price_cents bigint,p_currency text,p_idempotency uuid
) returns jsonb language sql volatile security invoker
set search_path=pg_catalog,public,nosbloc_private
as $$ select nosbloc_private.create_product(p_project,p_title,p_type,p_description,p_price_cents,p_currency,p_idempotency) $$;

create or replace function public.nosbloc_update_product_api(
  p_product uuid,p_title text,p_description text,p_price_cents bigint,p_rights_confirmed boolean,p_idempotency uuid
) returns jsonb language sql volatile security invoker
set search_path=pg_catalog,public,nosbloc_private
as $$ select nosbloc_private.update_product(p_product,p_title,p_description,p_price_cents,p_rights_confirmed,p_idempotency) $$;

create or replace function public.nosbloc_submit_product_api(p_product uuid,p_idempotency uuid)
returns jsonb language sql volatile security invoker
set search_path=pg_catalog,public,nosbloc_private
as $$ select nosbloc_private.submit_product(p_product,p_idempotency) $$;

create or replace function public.nosbloc_request_refund_api(
  p_order uuid,p_amount_cents bigint,p_reason text,p_idempotency uuid
) returns jsonb language sql volatile security invoker
set search_path=pg_catalog,public,nosbloc_private
as $$ select nosbloc_private.request_refund(p_order,p_amount_cents,p_reason,p_idempotency) $$;

create or replace function public.nosbloc_request_payout_api(p_amount_cents bigint,p_idempotency uuid)
returns jsonb language sql volatile security invoker
set search_path=pg_catalog,public,nosbloc_private
as $$ select nosbloc_private.request_payout(p_amount_cents,p_idempotency) $$;

create or replace function public.nosbloc_finance_snapshot_api()
returns jsonb language sql stable security invoker
set search_path=pg_catalog,public,nosbloc_private
as $$ select nosbloc_private.finance_snapshot() $$;

revoke all on function nosbloc_private.create_product(uuid,text,text,text,bigint,text,uuid) from public,anon,authenticated;
revoke all on function nosbloc_private.update_product(uuid,text,text,bigint,boolean,uuid) from public,anon,authenticated;
revoke all on function nosbloc_private.submit_product(uuid,uuid) from public,anon,authenticated;
revoke all on function nosbloc_private.request_refund(uuid,bigint,text,uuid) from public,anon,authenticated;
revoke all on function nosbloc_private.request_payout(bigint,uuid) from public,anon,authenticated;
revoke all on function nosbloc_private.finance_snapshot() from public,anon,authenticated;

grant execute on function nosbloc_private.create_product(uuid,text,text,text,bigint,text,uuid) to authenticated;
grant execute on function nosbloc_private.update_product(uuid,text,text,bigint,boolean,uuid) to authenticated;
grant execute on function nosbloc_private.submit_product(uuid,uuid) to authenticated;
grant execute on function nosbloc_private.request_refund(uuid,bigint,text,uuid) to authenticated;
grant execute on function nosbloc_private.request_payout(bigint,uuid) to authenticated;
grant execute on function nosbloc_private.finance_snapshot() to authenticated;

revoke all on function public.nosbloc_create_product_api(uuid,text,text,text,bigint,text,uuid) from public,anon,authenticated;
revoke all on function public.nosbloc_update_product_api(uuid,text,text,bigint,boolean,uuid) from public,anon,authenticated;
revoke all on function public.nosbloc_submit_product_api(uuid,uuid) from public,anon,authenticated;
revoke all on function public.nosbloc_request_refund_api(uuid,bigint,text,uuid) from public,anon,authenticated;
revoke all on function public.nosbloc_request_payout_api(bigint,uuid) from public,anon,authenticated;
revoke all on function public.nosbloc_finance_snapshot_api() from public,anon,authenticated;

grant execute on function public.nosbloc_create_product_api(uuid,text,text,text,bigint,text,uuid) to authenticated;
grant execute on function public.nosbloc_update_product_api(uuid,text,text,bigint,boolean,uuid) to authenticated;
grant execute on function public.nosbloc_submit_product_api(uuid,uuid) to authenticated;
grant execute on function public.nosbloc_request_refund_api(uuid,bigint,text,uuid) to authenticated;
grant execute on function public.nosbloc_request_payout_api(bigint,uuid) to authenticated;
grant execute on function public.nosbloc_finance_snapshot_api() to authenticated;

comment on table public.nosbloc_ledger_entries is
  'Immutable EUR ledger. Only trusted server/payment webhook code may insert financial entries.';
comment on table public.nosbloc_payout_accounts is
  'Creator payout identity. payouts_enabled requires verified KYC and complete tax status.';
comment on table public.nosbloc_payout_requests is
  'Creator payout requests. Processing and final state transitions are trusted-server only.';
comment on view public.nosbloc_wallet_balances is
  'Security-invoker aggregate over the RLS-protected Nosbloc EUR ledger.';
