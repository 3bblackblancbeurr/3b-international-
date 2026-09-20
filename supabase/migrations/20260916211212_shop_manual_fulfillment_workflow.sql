alter table public.shop_orders
  add column if not exists loyalty_user_id uuid,
  add column if not exists seller_due_at timestamptz,
  add column if not exists seller_accepted_at timestamptz,
  add column if not exists ship_due_at timestamptz,
  add column if not exists shipped_at timestamptz,
  add column if not exists seller_user_id uuid,
  add column if not exists updated_at timestamptz not null default now();

alter table public.shop_orders drop constraint if exists shop_orders_fulfillment_status_check;
alter table public.shop_orders add constraint shop_orders_fulfillment_status_check
  check (fulfillment_status = any (array['awaiting_seller'::text,'processing'::text,'shipped'::text,'cancelled'::text,'refunded'::text]));

update public.shop_orders
set fulfillment_status = 'awaiting_seller',
    seller_due_at = coalesce(seller_due_at, created_at + interval '5 days'),
    updated_at = now()
where payment_status = 'paid' and fulfillment_status = 'new';

update public.shop_orders
set seller_due_at = coalesce(seller_due_at, created_at + interval '5 days')
where payment_status = 'paid' and seller_due_at is null;

create index if not exists shop_orders_fulfillment_due_idx
  on public.shop_orders (fulfillment_status, seller_due_at, created_at desc);
