-- Align the database invariant with the authoritative server wallet rule.
-- Existing rows were verified below the old cap before this migration.

alter table public.economy_accounts
  drop constraint if exists economy_accounts_xp_check;

alter table public.economy_accounts
  add constraint economy_accounts_xp_check
  check (xp >= 0 and xp <= 1000000000);
