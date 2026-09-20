create table if not exists public.threeb_crypto_release_gate (
  singleton boolean primary key default true check (singleton),
  gate_version text not null default '2026.1',
  wallet_model_approved boolean not null default false,
  vault_strategy_approved boolean not null default false,
  vault_recovery_tested boolean not null default false,
  crypto_suite_reviewed boolean not null default false,
  testnet_authorized boolean not null default false,
  protocol_security_reviewed boolean not null default false,
  external_audit_approved boolean not null default false,
  red_team_approved boolean not null default false,
  legal_mica_approved boolean not null default false,
  mainnet_authorized boolean not null default false,
  updated_at timestamptz not null default now(),
  check (
    not testnet_authorized
    or (wallet_model_approved and vault_strategy_approved and crypto_suite_reviewed)
  ),
  check (
    not vault_recovery_tested
    or vault_strategy_approved
  ),
  check (
    not mainnet_authorized
    or (
      testnet_authorized
      and protocol_security_reviewed
      and external_audit_approved
      and red_team_approved
      and legal_mica_approved
      and vault_recovery_tested
    )
  )
);

insert into public.threeb_crypto_release_gate(singleton)
values(true)
on conflict(singleton) do nothing;

alter table public.threeb_crypto_release_gate enable row level security;
revoke all on public.threeb_crypto_release_gate from public,anon,authenticated,service_role;

create or replace function public.threeb_crypto_flags_guard()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
declare
  g public.threeb_crypto_release_gate%rowtype;
begin
  select * into g
  from public.threeb_crypto_release_gate
  where singleton=true;

  if not found then
    raise exception '3bc_release_gate_missing';
  end if;

  if new.token_enabled then
    if not (
      g.wallet_model_approved
      and g.vault_strategy_approved
      and g.crypto_suite_reviewed
      and g.testnet_authorized
    ) then
      raise exception '3bc_testnet_gate_not_satisfied';
    end if;
  end if;

  if new.token_blockchain_enabled then
    if not new.token_enabled then
      raise exception '3bc_token_must_be_enabled_first';
    end if;
    if not (
      g.vault_recovery_tested
      and g.protocol_security_reviewed
    ) then
      raise exception '3bc_blockchain_gate_not_satisfied';
    end if;
  end if;

  if new.token_trading_enabled then
    if not new.token_blockchain_enabled then
      raise exception '3bc_blockchain_must_be_enabled_first';
    end if;
    if not (
      g.external_audit_approved
      and g.red_team_approved
      and g.legal_mica_approved
      and g.mainnet_authorized
    ) then
      raise exception '3bc_mainnet_gate_not_satisfied';
    end if;
  end if;

  return new;
end
$$;

revoke all on function public.threeb_crypto_flags_guard()
from public,anon,authenticated,service_role;

drop trigger if exists threeb_crypto_flags_guard on public.threeb_economy_flags;
create trigger threeb_crypto_flags_guard
before insert or update of token_enabled,token_blockchain_enabled,token_trading_enabled
on public.threeb_economy_flags
for each row
execute function public.threeb_crypto_flags_guard();
