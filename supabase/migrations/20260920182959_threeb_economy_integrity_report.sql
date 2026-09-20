create unique index if not exists threeb_seasons_single_active_idx
on public.threeb_seasons((status))
where status='active';

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
  v_disabled_token_rows bigint;
  v_active_seasons bigint;
  v_flags public.threeb_economy_flags%rowtype;
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

  select * into v_flags
  from public.threeb_economy_flags
  where singleton=true;

  if coalesce(v_flags.token_enabled,false)
     or coalesce(v_flags.token_blockchain_enabled,false)
     or coalesce(v_flags.token_trading_enabled,false) then
    v_disabled_token_rows:=0;
  else
    select count(*) into v_disabled_token_rows
    from public.threeb_token_ledger;
  end if;

  select count(*) into v_active_seasons
  from public.threeb_seasons
  where status='active'
    and (starts_at is null or starts_at<=now())
    and (ends_at is null or ends_at>now());

  return jsonb_build_object(
    'ok',
      v_xp_drift=0
      and v_negative_coins=0
      and v_bad_prestige=0
      and v_orphan_outbox=0
      and v_disabled_token_rows=0
      and v_active_seasons<=1,
    'xp_profile_wallet_drift',v_xp_drift,
    'negative_coin_accounts',v_negative_coins,
    'invalid_prestige_accounts',v_bad_prestige,
    'credited_outbox_without_ledger',v_orphan_outbox,
    'disabled_3bc_ledger_rows',v_disabled_token_rows,
    'active_seasons',v_active_seasons,
    'generated_at',now()
  );
end
$$;

revoke all on function public.threeb_economy_integrity_report_server()
from public,anon,authenticated;
grant execute on function public.threeb_economy_integrity_report_server()
to service_role;
