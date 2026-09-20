create table if not exists public.nexus_cities (
  user_id uuid primary key references auth.users(id) on delete cascade,
  city_id uuid not null default gen_random_uuid(),
  revision bigint not null default 0 check (revision >= 0),
  save_version integer not null default 1 check (save_version = 1),
  city jsonb not null default '{"version":1,"level":1,"xp":0,"currency":500,"placements":[],"roads":[],"unlocked":[],"theme":"origin"}'::jsonb,
  updated_at timestamptz not null default now(),
  constraint nexus_city_size check (pg_column_size(city) <= 2097152)
);
alter table public.nexus_cities enable row level security;
drop policy if exists "nexus_city_select_own" on public.nexus_cities;
create policy "nexus_city_select_own" on public.nexus_cities for select to authenticated using (auth.uid() = user_id);
drop policy if exists "nexus_city_insert_own" on public.nexus_cities;
create policy "nexus_city_insert_own" on public.nexus_cities for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "nexus_city_update_own" on public.nexus_cities;
create policy "nexus_city_update_own" on public.nexus_cities for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index if not exists nexus_cities_updated_at_idx on public.nexus_cities(updated_at desc);
revoke delete on public.nexus_cities from authenticated;
