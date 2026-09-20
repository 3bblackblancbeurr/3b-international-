-- 3B Fortress foundation hardening — applied to Supabase on 2026-09-20.
-- Least privilege only. Does not enable token, blockchain, trading, minting or real funds.

revoke all privileges on table public.threeb_economy_flags from anon;

revoke insert, update, delete, truncate, references, trigger
  on table public.threeb_economy_flags from authenticated;

grant select on table public.threeb_economy_flags to authenticated;

alter function public.threeb_credit_reward_server(uuid, text, text)
  set search_path = '';

alter function public.threeb_enforce_global_item_rarity_supply()
  set search_path = '';

alter function public.threeb_rarity_supply_status()
  set search_path = '';

alter function public.threeb_wallet_apply_server(uuid, integer, bigint)
  set search_path = '';
