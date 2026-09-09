-- Run in the existing Supabase project, first in the test environment.
-- Only the server service role can read or write customer order details.
create table if not exists public.shop_orders (
  stripe_session_id text primary key,
  payment_intent_id text,
  livemode boolean not null,
  payment_status text not null check (payment_status = 'paid'),
  fulfillment_status text not null default 'new'
    check (fulfillment_status in ('new', 'processing', 'shipped', 'cancelled', 'refunded')),
  amount_total bigint not null check (amount_total >= 0),
  currency text not null,
  customer_email text,
  customer_name text,
  shipping_details jsonb,
  items jsonb not null,
  created_at timestamptz not null default now()
);
alter table public.shop_orders enable row level security;
revoke all on public.shop_orders from anon, authenticated;
grant select, insert, update on public.shop_orders to service_role;
-- There is deliberately no client-side RLS policy. The local 3B passport
-- is not authentication and must not grant access to any customer order.
