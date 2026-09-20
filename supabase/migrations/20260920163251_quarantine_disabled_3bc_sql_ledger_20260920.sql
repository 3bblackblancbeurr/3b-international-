-- Quarantine the disabled SQL token foundation.
-- This table is NOT a blockchain and MUST NOT become authoritative 3BC state.

revoke all privileges on table public.threeb_token_ledger from anon, authenticated;
drop policy if exists threeb_token_ledger_read_own on public.threeb_token_ledger;

comment on table public.threeb_token_ledger is
  'NON-AUTHORITATIVE DISABLED STAGING LEDGER. Not blockchain state. No real 3BC value. Client access forbidden until security/testnet gates are satisfied.';

create or replace function public.threeb_token_ledger_fail_closed()
returns trigger
language plpgsql
set search_path = ''
as $function$
begin
  if not exists (
    select 1
    from public.threeb_economy_flags
    where singleton=true
      and token_enabled=true
      and token_blockchain_enabled=true
  ) then
    raise exception '3bc_disabled_security_gate';
  end if;
  return new;
end;
$function$;

revoke all on function public.threeb_token_ledger_fail_closed() from public, anon, authenticated;
grant execute on function public.threeb_token_ledger_fail_closed() to service_role;

drop trigger if exists threeb_token_ledger_fail_closed on public.threeb_token_ledger;
create trigger threeb_token_ledger_fail_closed
before insert or update on public.threeb_token_ledger
for each row execute function public.threeb_token_ledger_fail_closed();
