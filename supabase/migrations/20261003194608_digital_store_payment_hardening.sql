begin;
alter table public.digital_store_purchases add column refunded_amount_cents integer not null default 0 check(refunded_amount_cents>=0),
 add column wallet_revoked_amount integer not null default 0 check(wallet_revoked_amount>=0);
update public.digital_store_purchases set refunded_amount_cents=coalesce(amount_cents,0),wallet_revoked_amount=coalesce(wallet_amount,0) where status in ('refunded','revoked');
alter table public.digital_credit_ledger add column refund_total_cents integer not null default 0;
alter table public.digital_credit_ledger drop constraint digital_credit_ledger_purchase_id_asset_kind_key;
alter table public.digital_credit_ledger add constraint digital_credit_ledger_operation_unique unique(purchase_id,asset,kind,refund_total_cents);

-- Record every verified charge, even when another charge already acquired the object.
do $patch$ declare body text;needle text;replacement text;begin
 body:=pg_get_functiondef('public.digital_store_fulfill_nonconsumable(uuid,text,text,text,text,integer,text,text,jsonb)'::regprocedure);
 body:=replace(body,' select * into v_product from public.digital_store_products where code=p_product_code for update;',
 $locks$ perform pg_advisory_xact_lock(hashtextextended('digital-transaction:'||p_provider||':'||p_provider_transaction_id,0));
 perform pg_advisory_xact_lock(hashtextextended('digital-wallet:'||p_user::text,0));
 select * into v_product from public.digital_store_products where code=p_product_code for update;$locks$);
 needle:=$old$return jsonb_build_object('ok',v_purchase.status='paid','purchaseId',v_purchase.id,'itemInstanceId',v_purchase.item_instance_id,'status',v_purchase.status,'duplicate',true);$old$;
 replacement:=$new$if v_purchase.user_id<>p_user or v_purchase.product_code<>p_product_code then raise exception 'transaction_owner_mismatch';end if;
  return jsonb_build_object('ok',v_purchase.status='paid' and not coalesce((v_purchase.metadata->>'requires_refund')::boolean,false),'purchaseId',v_purchase.id,'itemInstanceId',v_purchase.item_instance_id,'status',v_purchase.status,'duplicate',true,'refundNeeded',v_purchase.status='paid' and coalesce((v_purchase.metadata->>'requires_refund')::boolean,false));$new$;
 if position(needle in body)=0 then raise exception 'Review nonconsumable replay function';end if;
 body:=replace(body,needle,replacement);
 needle:=$old$return jsonb_build_object('ok',true,'purchaseId',v_entitlement.source_purchase_id,'itemInstanceId',v_entitlement.item_instance_id,'status','already_owned','duplicate',true);$old$;
 replacement:=$new$if p_provider in ('wallet','manual_test') then raise exception 'already_owned';end if;
  insert into public.digital_store_purchases(user_id,product_code,provider,provider_transaction_id,provider_product_ref,amount_cents,currency,status,receipt_hash,metadata)
  values(p_user,p_product_code,p_provider,p_provider_transaction_id,p_provider_product_ref,p_amount_cents,p_currency,'paid',p_receipt_hash,p_metadata||jsonb_build_object('requires_refund',true,'duplicate_entitlement',v_entitlement.source_purchase_id)) returning * into v_purchase;
  return jsonb_build_object('ok',false,'purchaseId',v_purchase.id,'status','duplicate_payment','refundNeeded',true);$new$;
 if position(needle in body)=0 then raise exception 'Review nonconsumable ownership function';end if;
 execute replace(body,needle,replacement);
 body:=pg_get_functiondef('public.digital_store_fulfill_v2(uuid,text,text,text,text,integer,text,text,jsonb)'::regprocedure);
 body:=replace(body,$old$'status',purchase.status,'duplicate',true)$old$,$new$'status',purchase.status,'duplicate',true,'refundNeeded',purchase.status='paid' and coalesce((purchase.metadata->>'requires_refund')::boolean,false))$new$);
 execute body;
end $patch$;

create function public.digital_store_refund_purchase(p_provider text,p_provider_transaction_id text,p_refunded_cents integer)
returns jsonb language plpgsql security definer set search_path='' as $$
declare purchase public.digital_store_purchases;revoked integer;delta integer;
begin
 perform pg_advisory_xact_lock(hashtextextended('digital-transaction:'||p_provider||':'||p_provider_transaction_id,0));
 select * into purchase from public.digital_store_purchases where provider=p_provider and provider_transaction_id=p_provider_transaction_id;
 if not found then return jsonb_build_object('ok',true,'found',false);end if;
 perform pg_advisory_xact_lock(hashtextextended('digital-wallet:'||purchase.user_id::text,0));
 select * into purchase from public.digital_store_purchases where id=purchase.id for update;
 if p_refunded_cents is null or p_refunded_cents<0 or p_refunded_cents>coalesce(purchase.amount_cents,0) then raise exception 'invalid_refund_amount';end if;
 if p_refunded_cents<=purchase.refunded_amount_cents then return jsonb_build_object('ok',true,'found',true,'duplicate',true);end if;
 if purchase.wallet_asset is not null then
  revoked:=floor(purchase.wallet_amount::numeric*p_refunded_cents/greatest(1,purchase.amount_cents))::integer;
  delta:=greatest(0,revoked-purchase.wallet_revoked_amount);
  if delta>0 then
   update public.digital_credit_accounts set balance=balance-delta,updated_at=now() where user_id=purchase.user_id and asset=purchase.wallet_asset;
   insert into public.digital_credit_ledger(user_id,asset,delta,kind,purchase_id,refund_total_cents) values(purchase.user_id,purchase.wallet_asset,-delta,'refund',purchase.id,p_refunded_cents);
  end if;
 else
  revoked:=0;
  update public.digital_store_entitlements set status='revoked',revoked_at=now(),updated_at=now() where source_purchase_id=purchase.id;
  update public.item_instances set state='retired',metadata=coalesce(metadata,'{}'::jsonb)||jsonb_build_object('revoked',true,'revocation_reason','refund') where id=purchase.item_instance_id;
 end if;
 update public.digital_store_purchases set refunded_amount_cents=p_refunded_cents,wallet_revoked_amount=revoked,
  status=case when wallet_asset is null or p_refunded_cents=amount_cents then 'refunded' else status end,
  refunded_at=now(),updated_at=now() where id=purchase.id;
 return jsonb_build_object('ok',true,'found',true,'duplicate',false,'refundedCents',p_refunded_cents,'revokedCredits',revoked);
end $$;
revoke all on function public.digital_store_refund_purchase(text,text,integer) from public,anon,authenticated;
grant execute on function public.digital_store_refund_purchase(text,text,integer) to service_role;

-- Full refunds and disputes use the same cumulative accounting, including prior partial refunds.
create or replace function public.digital_store_revoke_purchase(p_provider text,p_provider_transaction_id text,p_reason text default 'refund')
returns jsonb language plpgsql security definer set search_path='' as $$
declare purchase public.digital_store_purchases;result jsonb;
begin
 perform pg_advisory_xact_lock(hashtextextended('digital-transaction:'||p_provider||':'||p_provider_transaction_id,0));
 select * into purchase from public.digital_store_purchases where provider=p_provider and provider_transaction_id=p_provider_transaction_id;
 if not found then return jsonb_build_object('ok',true,'found',false);end if;
 result:=public.digital_store_refund_purchase(p_provider,p_provider_transaction_id,coalesce(purchase.amount_cents,0));
 if p_reason<>'refund' then update public.digital_store_purchases set status='revoked',revoked_at=now() where id=purchase.id;end if;
 return result;
end $$;
create function public.digital_store_settle_v3(
 p_user uuid,p_product_code text,p_provider text,p_provider_transaction_id text,p_provider_product_ref text,
 p_amount_cents integer,p_currency text,p_receipt_hash text,p_metadata jsonb,p_refunded_cents integer default 0
) returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
 result:=public.digital_store_fulfill_v2(p_user,p_product_code,p_provider,p_provider_transaction_id,p_provider_product_ref,p_amount_cents,p_currency,p_receipt_hash,p_metadata);
 if p_refunded_cents>0 then
  perform public.digital_store_refund_purchase(p_provider,p_provider_transaction_id,p_refunded_cents);
  if p_refunded_cents=p_amount_cents or exists(select 1 from public.digital_store_products where code=p_product_code and product_kind='non_consumable') then
   result:=result||jsonb_build_object('ok',false,'refundNeeded',p_refunded_cents<p_amount_cents and coalesce((result->>'refundNeeded')::boolean,false),'status','refunded');
  end if;
 end if;
 return result;
end $$;
revoke all on function public.digital_store_settle_v3(uuid,text,text,text,text,integer,text,text,jsonb,integer) from public,anon,authenticated;
grant execute on function public.digital_store_settle_v3(uuid,text,text,text,text,integer,text,text,jsonb,integer) to service_role;
notify pgrst,'reload schema';
commit;
