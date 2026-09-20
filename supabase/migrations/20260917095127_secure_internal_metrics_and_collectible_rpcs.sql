begin;
-- Internal aggregate metrics must never be callable from the public Data API.
revoke execute on function public.app_metrics_summary() from public, anon, authenticated;
grant execute on function public.app_metrics_summary() to service_role;

-- Supply enforcement is a trigger implementation detail, not a client RPC.
revoke execute on function public.nexus_enforce_collectible_supply() from public, anon, authenticated;
grant execute on function public.nexus_enforce_collectible_supply() to service_role;

-- Collectible minting must be server-authoritative. Prevent clients from choosing an arbitrary user/item/source key.
revoke execute on function public.nexus_claim_collectible(uuid,text,text) from public, anon, authenticated;
grant execute on function public.nexus_claim_collectible(uuid,text,text) to service_role;
commit;
