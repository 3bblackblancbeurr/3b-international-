begin;
create index if not exists collectible_reward_claims_rule_code_idx on public.collectible_reward_claims(rule_code);
create index if not exists collectible_reward_rules_item_code_idx on public.collectible_reward_rules(item_code);
create index if not exists member_entitlements_plan_code_idx on public.member_entitlements(plan_code);
create index if not exists nexus_collectible_catalog_rarity_idx on public.nexus_collectible_catalog(rarity);
commit;
