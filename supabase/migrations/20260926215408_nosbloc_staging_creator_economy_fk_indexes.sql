create index if not exists nosbloc_stg_products_project_idx
  on public.nosbloc_stg_products(project_id)
  where project_id is not null;
create index if not exists nosbloc_stg_orders_project_idx
  on public.nosbloc_stg_orders(project_id)
  where project_id is not null;
create index if not exists nosbloc_stg_entitlements_order_idx
  on public.nosbloc_stg_entitlements(order_id);
create index if not exists nosbloc_stg_entitlements_product_idx
  on public.nosbloc_stg_entitlements(product_id);
create index if not exists nosbloc_stg_ledger_project_idx
  on public.nosbloc_stg_ledger_entries(project_id)
  where project_id is not null;
create index if not exists nosbloc_stg_ledger_order_idx
  on public.nosbloc_stg_ledger_entries(order_id)
  where order_id is not null;
create index if not exists nosbloc_stg_refunds_order_idx
  on public.nosbloc_stg_refund_requests(order_id);
