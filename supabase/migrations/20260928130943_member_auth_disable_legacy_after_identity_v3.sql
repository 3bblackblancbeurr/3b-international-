update public.member_auth_settings
set allow_legacy_flows=false, updated_at=now()
where singleton=true and allow_legacy_flows=true;

comment on table public.member_auth_settings is
  'Service-only authentication rollout settings. Legacy register/recover endpoints are disabled after the v2 identity-aware frontend cutover.';
