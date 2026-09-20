-- 3B economy invariant alignment — applied to Supabase on 2026-09-20.
-- Existing data was verified below the previous 10,000 XP cap before applying.
-- This keeps the database aligned with the authoritative server rule.

alter table public.economy_accounts
  drop constraint if exists economy_accounts_xp_check;

alter table public.economy_accounts
  add constraint economy_accounts_xp_check
  check (xp >= 0 and xp <= 1000000000);
