create or replace function public.threeb_economy_integrity_report_server()
returns jsonb
language plpgsql
security definer
stable
set search_path=''
as $$
declare
  v_xp_drift bigint;
  v_negative_coins bigint;
  v_bad_prestige bigint;
  v_orphan_outbox bigint;
  v_token_rows bigint;
  v_active_token_rules bigint;
  v_token_budget_seasons bigint;
  v_active_seasons bigint;
  v_flags public.threeb_economy_flags%rowtype;
  v_gate public.threeb_crypto_release_gate%rowtype;
begin
  select count(*) into v_xp_drift
  from public.economy_accounts e
  join public.member_profiles p on p.user_id=e.user_id
  where e.xp::bigint is distinct from p.xp::bigint;

  select count(*) into v_negative_coins
  from public.economy_accounts
  where coins<0;

  select count(*) into v_bad_prestige
  from public.threeb_prestige_profiles pp
  left join public.economy_accounts e on e.user_id=pp.user_id
  where pp.prestige_level>0
    and public.threeb_level_from_xp(coalesce(e.xp,0)::bigint)<150;

  select count(*) into v_orphan_outbox
  from public.threeb_reward_outbox o
  where o.status='credited'
    and not exists(
      select 1
      from public.threeb_wallet_ledger l
      where l.user_id=o.user_id
        and l.event_key='reward:'||o.reward_code
        and l.event_id=o.event_id
    );

  select count(*) into v_token_rows
  from public.threeb_token_ledger;

  select count(*) into v_active_token_rules
  from public.threeb_token_reward_rules
  where active=true;

  select count(*) into v_token_budget_seasons
  from public.threeb_seasons
  where token_budget>0;

  select count(*) into v_active_seasons
  from public.threeb_seasons
  where status='active'
    and (starts_at is null or starts_at<=now())
    and (ends_at is null or ends_at>now());

  select * into v_flags
  from public.threeb_economy_flags
  where singleton=true;

  select * into v_gate
  from public.threeb_crypto_release_gate
  where singleton=true;

  return jsonb_build_object(
    'ok',
      v_xp_drift=0
      and v_negative_coins=0
      and v_bad_prestige=0
      and v_orphan_outbox=0
      and v_active_seasons<=1
      and (
        coalesce(v_flags.token_enabled,false)
        or (
          v_token_rows=0
          and v_active_token_rules=0
          and v_token_budget_seasons=0
        )
      ),
    'xp_profile_wallet_drift',v_xp_drift,
    'negative_coin_accounts',v_negative_coins,
    'invalid_prestige_accounts',v_bad_prestige,
    'credited_outbox_without_ledger',v_orphan_outbox,
    'token_ledger_rows',v_token_rows,
    'active_token_reward_rules',v_active_token_rules,
    'seasons_with_token_budget',v_token_budget_seasons,
    'active_seasons',v_active_seasons,
    'crypto_flags',jsonb_build_object(
      'token_enabled',coalesce(v_flags.token_enabled,false),
      'blockchain_enabled',coalesce(v_flags.token_blockchain_enabled,false),
      'trading_enabled',coalesce(v_flags.token_trading_enabled,false)
    ),
    'release_gate',jsonb_build_object(
      'wallet_model_approved',coalesce(v_gate.wallet_model_approved,false),
      'vault_strategy_approved',coalesce(v_gate.vault_strategy_approved,false),
      'vault_recovery_tested',coalesce(v_gate.vault_recovery_tested,false),
      'crypto_suite_reviewed',coalesce(v_gate.crypto_suite_reviewed,false),
      'testnet_authorized',coalesce(v_gate.testnet_authorized,false),
      'protocol_security_reviewed',coalesce(v_gate.protocol_security_reviewed,false),
      'external_audit_approved',coalesce(v_gate.external_audit_approved,false),
      'red_team_approved',coalesce(v_gate.red_team_approved,false),
      'legal_mica_approved',coalesce(v_gate.legal_mica_approved,false),
      'mainnet_authorized',coalesce(v_gate.mainnet_authorized,false)
    ),
    'generated_at',now()
  );
end
$$;

revoke all on function public.threeb_economy_integrity_report_server()
from public,anon,authenticated;
grant execute on function public.threeb_economy_integrity_report_server()
to service_role;
