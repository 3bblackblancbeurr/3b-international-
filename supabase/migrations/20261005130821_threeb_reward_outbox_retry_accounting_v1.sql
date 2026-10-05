-- Keep failure accounting outside the credit subtransaction. PostgreSQL rolls
-- back writes inside a BEGIN ... EXCEPTION block when credit or finalization fails.
-- Existing receipts and balances are unchanged; only future processing is fixed.
CREATE OR REPLACE FUNCTION public.threeb_process_reward_outbox_server(p_user uuid, p_limit integer DEFAULT 32)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  row public.threeb_reward_outbox%rowtype;
  result jsonb;
  err text;
  attempt_count integer;
  credited_count integer:=0;
  rejected_count integer:=0;
  pending_count integer:=0;
  limit_value integer:=least(50,greatest(1,coalesce(p_limit,32)));
begin
  if p_user is null then raise exception 'invalid_user'; end if;

  for row in
    select *
    from public.threeb_reward_outbox
    where user_id=p_user and status='pending'
    order by id
    for update skip locked
    limit limit_value
  loop
    update public.threeb_reward_outbox
    set attempts=least(100,attempts+1),last_error=null
    where id=row.id
    returning attempts into attempt_count;

    begin
      result:=public.threeb_credit_reward_server(row.user_id,row.reward_code,row.event_id);

      update public.threeb_reward_outbox
      set status='credited',processed_at=now(),last_error=null
      where id=row.id;

      credited_count:=credited_count+1;
    exception when others then
      err:=sqlerrm;

      if err in (
        'reward_daily_event_cap',
        'reward_daily_value_cap',
        'reward_lifetime_event_cap',
        'reward_already_claimed',
        'reward_level_required',
        'unknown_reward',
        'reward_policy_missing'
      ) then
        update public.threeb_reward_outbox
        set status='rejected',processed_at=now(),last_error=err
        where id=row.id;
        rejected_count:=rejected_count+1;
      elsif err in ('reward_cooldown','sensitive_reward_review_required') then
        update public.threeb_reward_outbox
        set status='pending',
            attempts=row.attempts,
            last_error=err
        where id=row.id;
        pending_count:=pending_count+1;
      else
        update public.threeb_reward_outbox
        set status=case when attempt_count>=5 then 'rejected' else 'pending' end,
            processed_at=case when attempt_count>=5 then now() else null end,
            last_error=left(err,240)
        where id=row.id;

        if attempt_count>=5 then rejected_count:=rejected_count+1;
        else pending_count:=pending_count+1;
        end if;
      end if;
    end;
  end loop;

  return jsonb_build_object(
    'credited',credited_count,
    'rejected',rejected_count,
    'pending',pending_count
  );
end
$function$;

revoke all on function public.threeb_process_reward_outbox_server(uuid,integer)
from public,anon,authenticated;
grant execute on function public.threeb_process_reward_outbox_server(uuid,integer)
to service_role;
