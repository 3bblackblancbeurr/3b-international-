create index if not exists nexus_city_asset_slots_asset_code_idx
  on public.nexus_city_asset_slots (asset_code);

create index if not exists nexus_city_asset_slots_item_instance_id_idx
  on public.nexus_city_asset_slots (item_instance_id);

create index if not exists nexus_city_collectible_displays_item_instance_id_idx
  on public.nexus_city_collectible_displays (item_instance_id);

create index if not exists nexus_city_journal_user_id_idx
  on public.nexus_city_journal (user_id);

create index if not exists nexus_city_placements_building_code_idx
  on public.nexus_city_placements (building_code);

create index if not exists nexus_city_unlocks_building_code_idx
  on public.nexus_city_unlocks (building_code);

create index if not exists nexus_city_visits_visitor_id_idx
  on public.nexus_city_visits (visitor_id);

drop policy if exists nexus_city_select_own on public.nexus_cities;

drop policy if exists nexus_city_insert_own on public.nexus_cities;
create policy nexus_city_insert_own
  on public.nexus_cities
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists nexus_city_update_own on public.nexus_cities;
create policy nexus_city_update_own
  on public.nexus_cities
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists wallet_ledger_read_own on public.threeb_wallet_ledger;
create policy wallet_ledger_read_own
  on public.threeb_wallet_ledger
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop index if exists public.nexus_city_placement_request_unique;
