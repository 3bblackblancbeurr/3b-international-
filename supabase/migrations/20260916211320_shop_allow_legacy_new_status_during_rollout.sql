alter table public.shop_orders drop constraint if exists shop_orders_fulfillment_status_check;
alter table public.shop_orders add constraint shop_orders_fulfillment_status_check
  check (fulfillment_status = any (array['new'::text,'awaiting_seller'::text,'processing'::text,'shipped'::text,'cancelled'::text,'refunded'::text]));
