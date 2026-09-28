create index if not exists digital_store_products_item_idx on public.digital_store_products(item_code);
create index if not exists digital_store_purchases_item_instance_idx on public.digital_store_purchases(item_instance_id) where item_instance_id is not null;
create index if not exists digital_store_entitlements_product_idx on public.digital_store_entitlements(product_code);
create index if not exists digital_store_entitlements_purchase_idx on public.digital_store_entitlements(source_purchase_id);
