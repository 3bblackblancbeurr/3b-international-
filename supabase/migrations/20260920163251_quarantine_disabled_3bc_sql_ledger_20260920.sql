-- Mirrors deployed Supabase migration 20260920163251.
-- Fail-closed quarantine for the disabled 3BC SQL ledger.

update public.threeb_economy_flags
set token_enabled=false,
    token_blockchain_enabled=false,
    token_trading_enabled=false,
    updated_at=now()
where singleton=true;

drop policy if exists threeb_token_ledger_read_own on public.threeb_token_ledger;
revoke all on public.threeb_token_ledger from anon,authenticated;
grant select,insert,update,delete,truncate,references,trigger
on public.threeb_token_ledger to service_role;

create or replace function public.threeb_token_ledger_fail_closed()
returns trigger
language plpgsql
set search_path to ''
as $$
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
$$;

revoke all on function public.threeb_token_ledger_fail_closed()
from public,anon,authenticated;
grant execute on function public.threeb_token_ledger_fail_closed()
to service_role;

drop trigger if exists threeb_token_ledger_fail_closed on public.threeb_token_ledger;
create trigger threeb_token_ledger_fail_closed
before insert or update on public.threeb_token_ledger
for each row execute function public.threeb_token_ledger_fail_closed();
