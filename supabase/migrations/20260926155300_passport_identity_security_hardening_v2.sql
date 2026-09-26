drop policy if exists passport_verification_tickets_deny_anon on public.passport_verification_tickets;
create policy passport_verification_tickets_deny_anon
on public.passport_verification_tickets
as restrictive for all to anon
using (false) with check (false);

drop policy if exists passport_verification_tickets_deny_authenticated on public.passport_verification_tickets;
create policy passport_verification_tickets_deny_authenticated
on public.passport_verification_tickets
as restrictive for all to authenticated
using (false) with check (false);

revoke execute on function public.passport_identity_snapshot() from authenticated;
grant execute on function public.passport_identity_snapshot() to service_role;