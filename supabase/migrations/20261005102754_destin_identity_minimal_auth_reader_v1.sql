-- Applied as 20261005102754. No broad SELECT grant on auth.users.
create or replace function threeb_identity_private.account_gate(p_user uuid)
returns table(email_ok boolean,account_ok boolean)
language sql stable security definer set search_path='' as $function$
 select u.email_confirmed_at is not null,
        not coalesce(u.is_anonymous,false) and (u.banned_until is null or u.banned_until<=statement_timestamp())
 from auth.users u where u.id=p_user and (auth.uid() is null or auth.uid()=p_user)
$function$;
revoke all on function threeb_identity_private.account_gate(uuid) from public,anon,authenticated;
grant execute on function threeb_identity_private.account_gate(uuid) to service_role;
do $patch$
declare source text; anchor text := 'select email_confirmed_at is not null,not coalesce(is_anonymous,false) and (banned_until is null or banned_until<=clock_timestamp()) into email_ok,account_ok from auth.users where id=p_user;';
begin
 select pg_get_functiondef('public.passport_destin_access_server_v1(uuid)'::regprocedure) into source;
 if (length(source)-length(replace(source,anchor,'')))/length(anchor)<>1 then raise exception 'Unexpected identity gate version'; end if;
 source:=replace(source,anchor,'select gate.email_ok,gate.account_ok into email_ok,account_ok from threeb_identity_private.account_gate(p_user) gate;');
 execute source;
end $patch$;
