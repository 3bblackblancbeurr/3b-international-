begin;

-- Nosbloc creator commerce v2. This file is intentionally pending until staging,
-- Stripe Connect sandbox and legal/compliance promotion gates are all green.

create table if not exists public.nosbloc_commerce_config (
  singleton boolean primary key default true check(singleton),
  commerce_enabled boolean not null default false,
  connect_enabled boolean not null default false,
  payouts_enabled boolean not null default false,
  currency text not null default 'eur' check(currency='eur'),
  platform_fee_bps integer not null default 1000 check(platform_fee_bps between 0 and 5000),
  updated_at timestamptz not null default now()
);
insert into public.nosbloc_commerce_config(singleton)
values(true) on conflict(singleton) do nothing;

create table if not exists public.nosbloc_connected_accounts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  stripe_account_id text unique,
  environment text not null default 'test' check(environment in('test','live')),
  onboarding_status text not null default 'not_started'
    check(onboarding_status in('not_started','pending','restricted','verified','disabled')),
  transfers_enabled boolean not null default false,
  payouts_enabled boolean not null default false,
  requirements_due integer not null default 0 check(requirements_due>=0),
  country text,
  last_stripe_sync_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check(stripe_account_id is null or stripe_account_id ~ '^acct_[A-Za-z0-9]+$')
);

create table if not exists public.nosbloc_products (
  product_id uuid primary key default gen_random_uuid(),
  project_id uuid not null,
  owner_id uuid not null references auth.users(id) on delete restrict,
  title text not null check(char_length(title) between 3 and 120),
  description text not null default '' check(char_length(description)<=2000),
  price_cents integer not null check(price_cents between 50 and 100000000),
  currency text not null default 'eur' check(currency='eur'),
  status text not null default 'draft'
    check(status in('draft','review','active','paused','archived')),
  tax_code text,
  version integer not null default 1 check(version>0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists nosbloc_products_project_idx on public.nosbloc_products(project_id);
create index if not exists nosbloc_products_owner_idx on public.nosbloc_products(owner_id);
create index if not exists nosbloc_products_status_idx on public.nosbloc_products(status);

create table if not exists public.nosbloc_orders (
  order_id uuid primary key,
  buyer_id uuid references auth.users(id) on delete set null,
  product_id uuid not null references public.nosbloc_products(product_id) on delete restrict,
  project_id uuid not null,
  stripe_session_id text unique,
  payment_intent_id text unique,
  transfer_group text not null unique,
  environment text not null default 'test' check(environment in('test','live')),
  status text not null default 'pending'
    check(status in('pending','paid','partially_refunded','refunded','disputed','cancelled')),
  gross_cents integer not null check(gross_cents>0),
  currency text not null default 'eur' check(currency='eur'),
  platform_fee_bps integer not null check(platform_fee_bps between 0 and 5000),
  paid_at timestamptz,
  refunded_cents integer not null default 0 check(refunded_cents>=0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check(refunded_cents<=gross_cents),
  check(stripe_session_id is null or stripe_session_id ~ '^cs_(test_|live_)?[A-Za-z0-9]+$'),
  check(payment_intent_id is null or payment_intent_id ~ '^pi_[A-Za-z0-9]+$')
);
create index if not exists nosbloc_orders_buyer_idx on public.nosbloc_orders(buyer_id,created_at desc);
create index if not exists nosbloc_orders_project_idx on public.nosbloc_orders(project_id,created_at desc);
create index if not exists nosbloc_orders_status_idx on public.nosbloc_orders(status,created_at desc);

create table if not exists public.nosbloc_order_allocations (
  allocation_id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.nosbloc_orders(order_id) on delete restrict,
  creator_id uuid not null references auth.users(id) on delete restrict,
  share_bps integer not null check(share_bps between 0 and 10000),
  gross_share_cents integer not null check(gross_share_cents>=0),
  platform_fee_cents integer not null check(platform_fee_cents>=0),
  creator_net_cents integer not null check(creator_net_cents>=0),
  transfer_status text not null default 'withheld'
    check(transfer_status in('withheld','ready','transferring','transferred','reversed','blocked')),
  stripe_transfer_id text unique,
  transferred_at timestamptz,
  created_at timestamptz not null default now(),
  check(platform_fee_cents+creator_net_cents=gross_share_cents),
  check(stripe_transfer_id is null or stripe_transfer_id ~ '^tr_[A-Za-z0-9]+$'),
  unique(order_id,creator_id)
);
create index if not exists nosbloc_allocations_creator_idx on public.nosbloc_order_allocations(creator_id,created_at desc);
create index if not exists nosbloc_allocations_status_idx on public.nosbloc_order_allocations(transfer_status,created_at);

create table if not exists public.nosbloc_real_money_ledger (
  ledger_id bigint generated always as identity primary key,
  creator_id uuid references auth.users(id) on delete restrict,
  order_id uuid references public.nosbloc_orders(order_id) on delete restrict,
  allocation_id uuid references public.nosbloc_order_allocations(allocation_id) on delete restrict,
  entry_type text not null
    check(entry_type in('sale_pending','sale_available','sale_transfer','platform_fee','refund','refund_reversal','dispute','adjustment')),
  bucket text not null check(bucket in('pending','available','paid_out','platform')),
  amount_cents integer not null check(amount_cents<>0),
  currency text not null default 'eur' check(currency='eur'),
  idempotency_key text not null unique check(char_length(idempotency_key) between 8 and 180),
  stripe_object_id text,
  metadata jsonb not null default '{}'::jsonb check(jsonb_typeof(metadata)='object'),
  created_at timestamptz not null default now()
);
create index if not exists nosbloc_real_ledger_creator_idx on public.nosbloc_real_money_ledger(creator_id,created_at desc);
create index if not exists nosbloc_real_ledger_order_idx on public.nosbloc_real_money_ledger(order_id,created_at);

create table if not exists public.nosbloc_stripe_events (
  event_id text primary key check(event_id ~ '^evt_[A-Za-z0-9]+$'),
  event_type text not null check(char_length(event_type) between 3 and 120),
  livemode boolean not null,
  object_id text,
  payload_hash text not null check(payload_hash ~ '^[0-9a-f]{64}$'),
  processed_at timestamptz not null default now()
);

create table if not exists public.nosbloc_refunds (
  refund_id text primary key check(refund_id ~ '^re_[A-Za-z0-9]+$'),
  order_id uuid not null references public.nosbloc_orders(order_id) on delete restrict,
  amount_cents integer not null check(amount_cents>0),
  currency text not null default 'eur' check(currency='eur'),
  reason text,
  created_at timestamptz not null default now()
);

create or replace view public.nosbloc_creator_balances
with (security_invoker=true)
as
select
  creator_id,
  currency,
  coalesce(sum(amount_cents) filter(where bucket='pending'),0)::bigint as pending_cents,
  coalesce(sum(amount_cents) filter(where bucket='available'),0)::bigint as available_cents,
  coalesce(sum(amount_cents) filter(where bucket='paid_out'),0)::bigint as paid_out_cents
from public.nosbloc_real_money_ledger
where creator_id is not null
group by creator_id,currency;

create or replace function public.nosbloc_reject_ledger_mutation()
returns trigger
language plpgsql
security invoker
set search_path=public,pg_temp
as $$
begin
  raise exception 'nosbloc_real_money_ledger_is_immutable';
end
$$;

drop trigger if exists nosbloc_real_ledger_immutable on public.nosbloc_real_money_ledger;
create trigger nosbloc_real_ledger_immutable
before update or delete on public.nosbloc_real_money_ledger
for each row execute function public.nosbloc_reject_ledger_mutation();

drop trigger if exists nosbloc_stripe_events_immutable on public.nosbloc_stripe_events;
create trigger nosbloc_stripe_events_immutable
before update or delete on public.nosbloc_stripe_events
for each row execute function public.nosbloc_reject_ledger_mutation();

alter table public.nosbloc_commerce_config enable row level security;
alter table public.nosbloc_connected_accounts enable row level security;
alter table public.nosbloc_products enable row level security;
alter table public.nosbloc_orders enable row level security;
alter table public.nosbloc_order_allocations enable row level security;
alter table public.nosbloc_real_money_ledger enable row level security;
alter table public.nosbloc_stripe_events enable row level security;
alter table public.nosbloc_refunds enable row level security;

revoke all on public.nosbloc_commerce_config from public,anon,authenticated;
revoke all on public.nosbloc_connected_accounts from public,anon,authenticated;
revoke all on public.nosbloc_products from public,anon,authenticated;
revoke all on public.nosbloc_orders from public,anon,authenticated;
revoke all on public.nosbloc_order_allocations from public,anon,authenticated;
revoke all on public.nosbloc_real_money_ledger from public,anon,authenticated;
revoke all on public.nosbloc_stripe_events from public,anon,authenticated;
revoke all on public.nosbloc_refunds from public,anon,authenticated;
revoke all on public.nosbloc_creator_balances from public,anon,authenticated;
revoke all on function public.nosbloc_reject_ledger_mutation() from public,anon,authenticated;

grant select,insert,update,delete on public.nosbloc_commerce_config to service_role;
grant select,insert,update,delete on public.nosbloc_connected_accounts to service_role;
grant select,insert,update,delete on public.nosbloc_products to service_role;
grant select,insert,update,delete on public.nosbloc_orders to service_role;
grant select,insert,update,delete on public.nosbloc_order_allocations to service_role;
grant select,insert on public.nosbloc_real_money_ledger to service_role;
grant select,insert on public.nosbloc_stripe_events to service_role;
grant select,insert on public.nosbloc_refunds to service_role;
grant select on public.nosbloc_creator_balances to service_role;
grant usage,select on sequence public.nosbloc_real_money_ledger_ledger_id_seq to service_role;

commit;
