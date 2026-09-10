begin;
drop function public.loyalty_record_purchase(uuid,text,text,bigint);
create function public.loyalty_record_purchase(p_user uuid,p_session text,p_intent text,p_cents bigint,p_refunded bigint default 0) returns boolean language plpgsql security invoker set search_path='' as $$
declare n integer;
begin
 if p_cents<0 or p_cents>100000000 or p_refunded<0 or p_refunded>p_cents then raise exception 'Montant invalide';end if;
 perform 1 from public.member_profiles where user_id=p_user for update;
 n=(p_cents-p_refunded)/10;
 insert into public.member_purchase_rewards(session_id,user_id,payment_intent,merchandise_cents,refunded_cents,points,xp) values(p_session,p_user,p_intent,p_cents,p_refunded,n,n) on conflict do nothing;
 if not found then return false;end if;
 return public.loyalty_grant(p_user,'purchase:'||p_session,'purchase','Achat boutique · '||right(p_session,8),n,n);
end;$$;
revoke all on function public.loyalty_record_purchase(uuid,text,text,bigint,bigint) from public,anon,authenticated;
grant execute on function public.loyalty_record_purchase(uuid,text,text,bigint,bigint) to service_role;
commit;
