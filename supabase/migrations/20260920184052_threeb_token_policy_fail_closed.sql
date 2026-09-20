create or replace function public.threeb_token_policy_fail_closed()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
declare
  f public.threeb_economy_flags%rowtype;
  g public.threeb_crypto_release_gate%rowtype;
begin
  select * into f
  from public.threeb_economy_flags
  where singleton=true;

  select * into g
  from public.threeb_crypto_release_gate
  where singleton=true;

  if tg_table_name='threeb_token_reward_rules' then
    if new.active and not (
      coalesce(f.token_enabled,false)
      and coalesce(f.token_blockchain_enabled,false)
      and coalesce(g.testnet_authorized,false)
      and coalesce(g.protocol_security_reviewed,false)
    ) then
      raise exception '3bc_reward_rule_gate_not_satisfied';
    end if;
  elsif tg_table_name='threeb_seasons' then
    if coalesce(new.token_budget,0)>0 and not (
      coalesce(f.token_enabled,false)
      and coalesce(f.token_blockchain_enabled,false)
      and coalesce(g.testnet_authorized,false)
      and coalesce(g.protocol_security_reviewed,false)
    ) then
      raise exception '3bc_season_budget_gate_not_satisfied';
    end if;
  end if;

  return new;
end
$$;

revoke all on function public.threeb_token_policy_fail_closed()
from public,anon,authenticated,service_role;

drop trigger if exists threeb_token_reward_rules_fail_closed
on public.threeb_token_reward_rules;

create trigger threeb_token_reward_rules_fail_closed
before insert or update of active
on public.threeb_token_reward_rules
for each row
execute function public.threeb_token_policy_fail_closed();

drop trigger if exists threeb_season_token_budget_fail_closed
on public.threeb_seasons;

create trigger threeb_season_token_budget_fail_closed
before insert or update of token_budget
on public.threeb_seasons
for each row
execute function public.threeb_token_policy_fail_closed();
