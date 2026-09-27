-- Cosmetic data only; existing profile RLS and service-only writes remain in force.
alter table public.penalty_profiles add column if not exists appearance jsonb not null default '{}'::jsonb
  check (jsonb_typeof(appearance)='object' and octet_length(appearance::text)<=512);
