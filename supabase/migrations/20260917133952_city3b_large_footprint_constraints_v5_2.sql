alter table public.nexus_city_placements drop constraint if exists nexus_city_placements_footprint_w_check;
alter table public.nexus_city_placements drop constraint if exists nexus_city_placements_footprint_h_check;
alter table public.nexus_city_placements add constraint nexus_city_placements_footprint_w_check check (footprint_w between 1 and 64);
alter table public.nexus_city_placements add constraint nexus_city_placements_footprint_h_check check (footprint_h between 1 and 64);
