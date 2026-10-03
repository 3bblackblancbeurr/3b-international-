-- XP and Coins are distinct entries in a user-wide unique transaction namespace.
-- Keep ledger/event idempotency and atomic rollback; never remove the unique index.
do $patch$
declare body text;
begin
 select pg_get_functiondef('public.threeb_credit_reward_server(uuid,text,text)'::regprocedure) into body;
 if strpos(body,'p_user_id,''xp'',v_xp_delta,''earn'',''reward'',v_idempotency,')=0 or strpos(body,'p_user_id,''coins'',v_coins_delta,''earn'',''reward'',v_idempotency,')=0 then raise exception 'Unexpected reward transaction definition';end if;
 body:=replace(body,'p_user_id,''xp'',v_xp_delta,''earn'',''reward'',v_idempotency,','p_user_id,''xp'',v_xp_delta,''earn'',''reward'',v_idempotency||'':xp'',');
 body:=replace(body,'p_user_id,''coins'',v_coins_delta,''earn'',''reward'',v_idempotency,','p_user_id,''coins'',v_coins_delta,''earn'',''reward'',v_idempotency||'':coins'',');
 execute body;
end $patch$;

