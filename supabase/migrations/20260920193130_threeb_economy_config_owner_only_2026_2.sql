update public.threeb_reward_policy
set policy_version='2026.2',
    updated_at=now()
where active=true;

revoke all on public.threeb_level_curve from service_role;
grant select on public.threeb_level_curve to service_role;

revoke all on public.threeb_reward_policy from service_role;
grant select on public.threeb_reward_policy to service_role;

revoke all on public.threeb_token_reward_rules from service_role;
grant select on public.threeb_token_reward_rules to service_role;

revoke all on public.threeb_seasons from service_role;
grant select on public.threeb_seasons to service_role;

revoke all on public.threeb_economy_flags from service_role;
grant select on public.threeb_economy_flags to service_role;
