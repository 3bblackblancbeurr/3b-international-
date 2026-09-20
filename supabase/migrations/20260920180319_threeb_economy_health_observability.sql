create or replace function public.threeb_economy_health_server(
  p_since timestamptz default (now() - interval '7 days')
)
returns jsonb
language plpgsql
security definer
stable
set search_path=''
as $$
declare
  v_since timestamptz:=coalesce(p_since,now()-interval '7 days');
  v_tx jsonb;
  v_outbox jsonb;
  v_risk jsonb;
  v_flags jsonb;
  v_levels jsonb;
begin
  select coalesce(jsonb_agg(row_to_json(t)),'[]'::jsonb)
  into v_tx
  from (
    select asset,kind,count(*)::bigint as operations,
           coalesce(sum(amount),0)::numeric as net_amount
    from public.economy_transactions
    where created_at>=v_since
    group by asset,kind
    order by asset,kind
  ) t;

  select coalesce(jsonb_object_agg(status,count),'{}'::jsonb)
  into v_outbox
  from (
    select status,count(*)::bigint as count
    from public.threeb_reward_outbox
    where created_at>=v_since
    group by status
  ) q;

  select jsonb_build_object(
    'normal',count(*) filter(where risk_score between 0 and 19),
    'watch',count(*) filter(where risk_score between 20 and 49),
    'sensitive_hold',count(*) filter(where risk_score between 50 and 79),
    'review',count(*) filter(where risk_score between 80 and 100)
  )
  into v_risk
  from public.threeb_economy_risk_profiles;

  select jsonb_build_object(
    'token_enabled',token_enabled,
    'token_blockchain_enabled',token_blockchain_enabled,
    'token_trading_enabled',token_trading_enabled,
    'economy_version',economy_version,
    'xp_curve_version',xp_curve_version,
    'season_enabled',season_enabled,
    'marketplace_enabled',marketplace_enabled,
    'unreal_world_enabled',unreal_world_enabled
  )
  into v_flags
  from public.threeb_economy_flags
  where singleton=true;

  select jsonb_build_object(
    'accounts',count(*),
    'average_level',coalesce(round(avg(public.threeb_level_from_xp(xp::bigint)),2),0),
    'level_100_plus',count(*) filter(where public.threeb_level_from_xp(xp::bigint)>=100),
    'level_150',count(*) filter(where public.threeb_level_from_xp(xp::bigint)>=150)
  )
  into v_levels
  from public.economy_accounts;

  return jsonb_build_object(
    'since',v_since,
    'generated_at',now(),
    'transactions',v_tx,
    'outbox',v_outbox,
    'risk_buckets',v_risk,
    'progression',v_levels,
    'flags',v_flags
  );
end
$$;

revoke all on function public.threeb_economy_health_server(timestamptz)
from public,anon,authenticated;
grant execute on function public.threeb_economy_health_server(timestamptz)
to service_role;
