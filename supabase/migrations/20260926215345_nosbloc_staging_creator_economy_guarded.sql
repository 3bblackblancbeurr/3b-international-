create table if not exists public.nosbloc_stg_products (
  product_id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.nosbloc_stg_creator_profiles(user_id) on delete cascade,
  project_id uuid references public.nosbloc_stg_projects(project_id) on delete cascade,
  title text not null check (char_length(title) between 3 and 120),
  product_type text not null check (product_type in ('access','asset','cosmetic','expansion','service')),
  price_cents bigint not null default 0 check (price_cents >= 0),
  currency char(3) not null default 'EUR' check (currency ~ '^[A-Z]{3}$'),
  status text not null default 'draft' check (status in ('draft','review','active','paused','archived')),
  rights_confirmed boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.nosbloc_stg_orders (
  order_id uuid primary key default gen_random_uuid(),
  buyer_id uuid not null references auth.users(id) on delete restrict,
  product_id uuid not null references public.nosbloc_stg_products(product_id) on delete restrict,
  project_id uuid references public.nosbloc_stg_projects(project_id) on delete restrict,
  gross_amount_cents bigint not null check (gross_amount_cents >= 0),
  currency char(3) not null default 'EUR' check (currency ~ '^[A-Z]{3}$'),
  provider text not null default 'stripe',
  provider_checkout_ref text,
  provider_payment_ref text,
  status text not null default 'pending' check (status in ('pending','paid','failed','cancelled','refunded','partially_refunded','disputed')),
  idempotency_key uuid not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.nosbloc_stg_entitlements (
  entitlement_id uuid primary key default gen_random_uuid(),
  buyer_id uuid not null references auth.users(id) on delete cascade,
  order_id uuid not null references public.nosbloc_stg_orders(order_id) on delete cascade,
  product_id uuid not null references public.nosbloc_stg_products(product_id) on delete restrict,
  status text not null default 'active' check (status in ('active','revoked','refunded')),
  granted_at timestamptz not null default now(),
  revoked_at timestamptz,
  unique (buyer_id, product_id, order_id)
);

create table if not exists public.nosbloc_stg_ledger_entries (
  entry_id uuid primary key default gen_random_uuid(),
  transaction_id uuid not null,
  account_user_id uuid references auth.users(id) on delete restrict,
  project_id uuid references public.nosbloc_stg_projects(project_id) on delete restrict,
  order_id uuid references public.nosbloc_stg_orders(order_id) on delete restrict,
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
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.nosbloc_stg_refund_requests (
  refund_request_id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.nosbloc_stg_orders(order_id) on delete restrict,
  requester_id uuid not null references auth.users(id) on delete restrict,
  amount_cents bigint not null check (amount_cents > 0),
  reason text not null check (char_length(reason) between 3 and 500),
  status text not null default 'requested' check (status in ('requested','review','approved','rejected','processing','refunded','failed')),
  idempotency_key uuid not null unique,
  created_at timestamptz not null default now(),
  decided_at timestamptz
);

create table if not exists public.nosbloc_stg_payout_accounts (
  user_id uuid primary key references public.nosbloc_stg_creator_profiles(user_id) on delete cascade,
  provider text,
  provider_account_ref text,
  kyc_status text not null default 'not_started' check (kyc_status in ('not_started','pending','verified','rejected','expired')),
  tax_status text not null default 'incomplete' check (tax_status in ('incomplete','pending','complete','rejected')),
  payouts_enabled boolean not null default false,
  minimum_payout_cents bigint not null default 10000 check (minimum_payout_cents >= 1000),
  updated_at timestamptz not null default now(),
  check (payouts_enabled = false or (kyc_status = 'verified' and tax_status = 'complete'))
);

create table if not exists public.nosbloc_stg_payout_requests (
  payout_id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.nosbloc_stg_creator_profiles(user_id) on delete restrict,
  amount_cents bigint not null check (amount_cents >= 1000),
  currency char(3) not null default 'EUR' check (currency ~ '^[A-Z]{3}$'),
  status text not null default 'blocked' check (status in ('blocked','requested','review','approved','processing','paid','failed','cancelled')),
  risk_review_required boolean not null default true,
  provider_reference text,
  idempotency_key uuid not null unique,
  requested_at timestamptz not null default now(),
  processed_at timestamptz,
  failure_reason text
);

create index if not exists nosbloc_stg_products_creator_idx on public.nosbloc_stg_products(creator_id,status,updated_at desc);
create index if not exists nosbloc_stg_orders_buyer_idx on public.nosbloc_stg_orders(buyer_id,created_at desc);
create index if not exists nosbloc_stg_orders_product_idx on public.nosbloc_stg_orders(product_id,created_at desc);
create index if not exists nosbloc_stg_entitlements_buyer_idx on public.nosbloc_stg_entitlements(buyer_id,status);
create index if not exists nosbloc_stg_ledger_user_idx on public.nosbloc_stg_ledger_entries(account_user_id,created_at desc);
create index if not exists nosbloc_stg_ledger_tx_idx on public.nosbloc_stg_ledger_entries(transaction_id);
create index if not exists nosbloc_stg_refunds_requester_idx on public.nosbloc_stg_refund_requests(requester_id,created_at desc);
create index if not exists nosbloc_stg_payout_requests_user_idx on public.nosbloc_stg_payout_requests(user_id,requested_at desc);

alter table public.nosbloc_stg_products enable row level security;
alter table public.nosbloc_stg_orders enable row level security;
alter table public.nosbloc_stg_entitlements enable row level security;
alter table public.nosbloc_stg_ledger_entries enable row level security;
alter table public.nosbloc_stg_refund_requests enable row level security;
alter table public.nosbloc_stg_payout_accounts enable row level security;
alter table public.nosbloc_stg_payout_requests enable row level security;

revoke all on public.nosbloc_stg_products from anon, authenticated;
revoke all on public.nosbloc_stg_orders from anon, authenticated;
revoke all on public.nosbloc_stg_entitlements from anon, authenticated;
revoke all on public.nosbloc_stg_ledger_entries from anon, authenticated;
revoke all on public.nosbloc_stg_refund_requests from anon, authenticated;
revoke all on public.nosbloc_stg_payout_accounts from anon, authenticated;
revoke all on public.nosbloc_stg_payout_requests from anon, authenticated;

grant select, insert, update on public.nosbloc_stg_products to authenticated;
grant select on public.nosbloc_stg_orders to authenticated;
grant select on public.nosbloc_stg_entitlements to authenticated;
grant select on public.nosbloc_stg_ledger_entries to authenticated;
grant select, insert on public.nosbloc_stg_refund_requests to authenticated;
grant select on public.nosbloc_stg_payout_accounts to authenticated;
grant select on public.nosbloc_stg_payout_requests to authenticated;

drop policy if exists nosbloc_stg_products_select on public.nosbloc_stg_products;
create policy nosbloc_stg_products_select on public.nosbloc_stg_products
for select to authenticated
using (
  creator_id = (select auth.uid())
  or (status = 'active' and rights_confirmed = true
      and exists (select 1 from public.nosbloc_stg_runtime_config c where c.id = true and c.discover_enabled = true))
);

drop policy if exists nosbloc_stg_products_insert on public.nosbloc_stg_products;
create policy nosbloc_stg_products_insert on public.nosbloc_stg_products
for insert to authenticated
with check (creator_id = (select auth.uid()) and status = 'draft' and rights_confirmed = false);

drop policy if exists nosbloc_stg_products_update on public.nosbloc_stg_products;
create policy nosbloc_stg_products_update on public.nosbloc_stg_products
for update to authenticated
using (creator_id = (select auth.uid()))
with check (creator_id = (select auth.uid()) and status in ('draft','review','paused','archived'));

drop policy if exists nosbloc_stg_orders_select on public.nosbloc_stg_orders;
create policy nosbloc_stg_orders_select on public.nosbloc_stg_orders
for select to authenticated
using (
  buyer_id = (select auth.uid())
  or exists (
    select 1 from public.nosbloc_stg_products p
    where p.product_id = nosbloc_stg_orders.product_id
      and p.creator_id = (select auth.uid())
  )
);

drop policy if exists nosbloc_stg_entitlements_select on public.nosbloc_stg_entitlements;
create policy nosbloc_stg_entitlements_select on public.nosbloc_stg_entitlements
for select to authenticated
using (buyer_id = (select auth.uid()));

drop policy if exists nosbloc_stg_ledger_select on public.nosbloc_stg_ledger_entries;
create policy nosbloc_stg_ledger_select on public.nosbloc_stg_ledger_entries
for select to authenticated
using (account_user_id = (select auth.uid()));

drop policy if exists nosbloc_stg_refund_select on public.nosbloc_stg_refund_requests;
create policy nosbloc_stg_refund_select on public.nosbloc_stg_refund_requests
for select to authenticated
using (
  requester_id = (select auth.uid())
  or exists (
    select 1 from public.nosbloc_stg_orders o
    join public.nosbloc_stg_products p on p.product_id = o.product_id
    where o.order_id = nosbloc_stg_refund_requests.order_id
      and p.creator_id = (select auth.uid())
  )
);

drop policy if exists nosbloc_stg_refund_insert on public.nosbloc_stg_refund_requests;
create policy nosbloc_stg_refund_insert on public.nosbloc_stg_refund_requests
for insert to authenticated
with check (
  requester_id = (select auth.uid())
  and exists (
    select 1 from public.nosbloc_stg_orders o
    where o.order_id = nosbloc_stg_refund_requests.order_id
      and o.buyer_id = (select auth.uid())
      and o.status in ('paid','partially_refunded')
      and nosbloc_stg_refund_requests.amount_cents <= o.gross_amount_cents
  )
);

drop policy if exists nosbloc_stg_payout_account_select on public.nosbloc_stg_payout_accounts;
create policy nosbloc_stg_payout_account_select on public.nosbloc_stg_payout_accounts
for select to authenticated using (user_id = (select auth.uid()));

drop policy if exists nosbloc_stg_payout_request_select on public.nosbloc_stg_payout_requests;
create policy nosbloc_stg_payout_request_select on public.nosbloc_stg_payout_requests
for select to authenticated using (user_id = (select auth.uid()));

create or replace function public.nosbloc_stg_block_ledger_mutation()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  raise exception 'Nosbloc staging ledger entries are immutable';
end;
$$;

revoke all on function public.nosbloc_stg_block_ledger_mutation() from public, anon, authenticated;

drop trigger if exists nosbloc_stg_ledger_immutable on public.nosbloc_stg_ledger_entries;
create trigger nosbloc_stg_ledger_immutable
before update or delete on public.nosbloc_stg_ledger_entries
for each row execute function public.nosbloc_stg_block_ledger_mutation();

create or replace view public.nosbloc_stg_wallet_balances
with (security_invoker = true)
as
select
  account_user_id as user_id,
  currency,
  coalesce(sum(
    case
      when status in ('available','paid') and direction = 'credit' then amount_cents
      when status in ('available','paid') and direction = 'debit' then -amount_cents
      else 0
    end
  ),0)::bigint as available_cents,
  coalesce(sum(
    case
      when status in ('pending','held') and direction = 'credit' then amount_cents
      when status in ('pending','held') and direction = 'debit' then -amount_cents
      else 0
    end
  ),0)::bigint as pending_cents
from public.nosbloc_stg_ledger_entries
where account_user_id is not null
group by account_user_id, currency;

revoke all on public.nosbloc_stg_wallet_balances from anon, authenticated;
grant select on public.nosbloc_stg_wallet_balances to authenticated;

comment on table public.nosbloc_stg_ledger_entries is
  'Staging-only immutable EUR ledger. Writes are server/service-only; payments runtime switch remains false.';
comment on table public.nosbloc_stg_payout_accounts is
  'Staging-only payout identity. payouts_enabled requires verified KYC and complete tax status.';
comment on view public.nosbloc_stg_wallet_balances is
  'Security-invoker aggregate over the RLS-protected staging ledger.';
