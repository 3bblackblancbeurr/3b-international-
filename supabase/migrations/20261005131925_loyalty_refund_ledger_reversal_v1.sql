-- Install one account-lock order for every loyalty reward entry point, followed
-- by the purchase-refund reversal. This pending migration changes definitions only.
-- The complete definitions below match the inspected live functions except for
-- acquiring account advisory locks before profile locks (including FK key locks).
begin;

CREATE OR REPLACE FUNCTION public.loyalty_record_purchase(p_user uuid, p_session text, p_intent text, p_cents bigint, p_refunded bigint DEFAULT 0)
 RETURNS boolean
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare n integer;
begin
 if p_cents<0 or p_cents>100000000 or p_refunded<0 or p_refunded>p_cents then raise exception 'Montant invalide';end if;
 -- Serialize with wallet credits and refunds before locking the profile.
 perform pg_advisory_xact_lock(hashtextextended(p_user::text,0));
 perform 1 from public.member_profiles where user_id=p_user for update;
 n=(p_cents-p_refunded)/10;
 insert into public.member_purchase_rewards(session_id,user_id,payment_intent,merchandise_cents,refunded_cents,points,xp) values(p_session,p_user,p_intent,p_cents,p_refunded,n,n) on conflict do nothing;
 if not found then return false;end if;
 return public.loyalty_grant(p_user,'purchase:'||p_session,'purchase','Achat boutique · '||right(p_session,8),n,n);
end;$function$;

CREATE OR REPLACE FUNCTION public.loyalty_game_beat(p_user uuid, p_run uuid, p_seq integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  r public.member_game_runs;
  seconds integer;
  new_seconds integer;
  x integer;
  p integer;
  used_x integer;
  used_p integer;
begin
  -- Serialize with wallet credits and refunds before locking the profile.
  perform pg_advisory_xact_lock(hashtextextended(p_user::text,0));
  perform 1 from public.member_profiles where user_id=p_user for update;

  select * into r
  from public.member_game_runs
  where id=p_run and user_id=p_user
  for update;

  if not found or r.ended then
    raise exception 'Partie expirée';
  end if;

  if p_seq<=r.seq then
    return jsonb_build_object('xp',0,'points',0);
  end if;

  seconds=floor(extract(epoch from now()-r.last_beat));

  if seconds<10 then
    return jsonb_build_object('xp',0,'points',0);
  end if;

  seconds=case when seconds>45 then 0 else least(20,seconds) end;
  new_seconds=r.active_seconds+seconds;

  -- Penalty Rush has its own server-authoritative reward system.
  -- Keep global play-session analytics, but never mint duplicate loyalty rewards here.
  if r.game='penalty-rush' then
    update public.member_game_runs
    set active_seconds=new_seconds,last_beat=now(),seq=p_seq
    where id=p_run;

    return jsonb_build_object(
      'xp',0,
      'points',0,
      'tracked_seconds',new_seconds,
      'reward_source','penalty-rush'
    );
  end if;

  x=(new_seconds/30-r.active_seconds/30)*10;
  p=new_seconds/60-r.active_seconds/60;

  select coalesce(sum(xp),0),coalesce(sum(points),0)
  into used_x,used_p
  from public.member_ledger
  where user_id=p_user
    and source='game'
    and created_at>=((now() at time zone 'Europe/Paris')::date::timestamp at time zone 'Europe/Paris');

  x=greatest(0,least(x,600-used_x));
  p=greatest(0,least(p,20-used_p));

  update public.member_game_runs
  set active_seconds=new_seconds,last_beat=now(),seq=p_seq
  where id=p_run;

  if x>0 or p>0 then
    perform public.loyalty_grant(
      p_user,
      'game:'||p_run||':'||p_seq,
      'game',
      'Temps de jeu · '||r.game,
      x,
      p
    );
  end if;

  return jsonb_build_object('xp',x,'points',p);
end;
$function$;

CREATE OR REPLACE FUNCTION public.card_arena_commit(p_match uuid, p_revision integer, p_state jsonb)
 RETURNS boolean
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare m public.card_arena_matches; r public.card_arena_rooms; player uuid; victory boolean; xp integer; c text; prof public.card_arena_profiles; v_champion uuid; finalists uuid[]; d1 jsonb; d2 jsonb; used_x integer; used_p integer; account_x integer; account_p integer; same_pair integer;
begin
 perform pg_advisory_xact_lock(733303);
 select * into m from public.card_arena_matches where id=p_match for update;
 if m.id is null or m.status<>'active' or m.revision<>p_revision then return false; end if;
 select * into r from public.card_arena_rooms where id=m.room_id for update;
 if r.status<>'active' then return false; end if;
 if p_state->>'winner' is null then
  update public.card_arena_matches set state=p_state,revision=revision+1,deadline=now()+interval '45 seconds' where id=m.id; return true;
 end if;
 -- Keep the arena lock, then acquire every reward account in UUID order
 -- before touching either participant profile or its account rewards.
 for player in
  select distinct participant.user_id
  from unnest(array[m.p1,m.p2]) as participant(user_id)
  where participant.user_id is not null
  order by participant.user_id
 loop
  perform pg_advisory_xact_lock(hashtextextended(player::text,0));
 end loop;
 v_champion=case p_state->>'winner' when '0' then m.p1 when '1' then m.p2 else null end;
 -- Exact tournament ties use the first bracket seed; the returned state records the tiebreak.
 if v_champion is null and r.mode='tournament' then v_champion=m.p1;p_state=jsonb_set(jsonb_set(p_state,'{winner}','0'),'{reason}','"seed_tiebreak"'); end if;
 update public.card_arena_matches set state=p_state,revision=revision+1,status='finished',winner=v_champion where id=m.id;
 foreach player in array array[m.p1,m.p2] loop
  if player is null then continue; end if;
  victory=v_champion=player;
  update public.card_arena_profiles set wins=wins+case when victory then 1 else 0 end,losses=losses+case when v_champion is not null and not victory then 1 else 0 end,
   rating=greatest(0,rating+case when r.mode='ranked' and v_champion is not null then case when victory then 16 else -16 end else 0 end)
   where user_id=player;
  select * into prof from public.card_arena_profiles where user_id=player for update;
  if (p_state->>'round')::integer>=6 and (prof.reward_day<>current_date or prof.reward_count<20) then
   xp=case when victory then 30 else 15 end;
   for c in select jsonb_array_elements_text(m.decks->(case when player=m.p1 then 0 else 1 end)->'cards') loop
    update public.card_arena_profiles set mastery=jsonb_set(mastery,array[c],to_jsonb(coalesce((mastery->>c)::integer,0)+xp),true) where user_id=player;
   end loop;
   update public.card_arena_profiles set reward_count=case when reward_day=current_date then reward_count+1 else 1 end,reward_day=current_date where user_id=player;
   -- A completed, sustained duel contributes to the same daily account cap as
   -- other games. Server time, ownership and match revision are authoritative.
   select count(*) into same_pair from public.card_arena_matches other
    where other.status='finished' and other.created_at>=((now() at time zone 'Europe/Paris')::date::timestamp at time zone 'Europe/Paris')
     and ((other.p1=m.p1 and other.p2=m.p2) or (other.p1=m.p2 and other.p2=m.p1));
   if (p_state->>'round')::integer>=12 and now()-m.created_at>=interval '90 seconds' and same_pair<=3 then
    perform 1 from public.member_profiles where user_id=player for update;
    select coalesce(sum(l.xp),0),coalesce(sum(l.points),0) into used_x,used_p from public.member_ledger l
     where l.user_id=player and l.source='game' and l.created_at>=((now() at time zone 'Europe/Paris')::date::timestamp at time zone 'Europe/Paris');
    account_x=greatest(0,least(case when victory then 40 else 20 end,600-used_x));account_p=greatest(0,least(1,20-used_p));
    if account_x>0 or account_p>0 then perform public.loyalty_grant(player,'card-arena:'||m.id||':'||player,'game','Duel du Cercle 3B',account_x,account_p);end if;
   end if;
  end if;
 end loop;
 if r.mode<>'tournament' or m.round=2 then update public.card_arena_rooms set status='finished',champion=v_champion where id=r.id;
 elsif (select count(*) from public.card_arena_matches where room_id=r.id and round=1 and status='finished')=2 then
  select array_agg(winner order by seat) into finalists from public.card_arena_matches where room_id=r.id and round=1;
  select e->'deck' into d1 from jsonb_array_elements(r.entrants) e where e->>'uid'=finalists[1]::text;
  select e->'deck' into d2 from jsonb_array_elements(r.entrants) e where e->>'uid'=finalists[2]::text;
  insert into public.card_arena_matches(room_id,round,seat,p1,p2,decks) values(r.id,2,0,finalists[1],finalists[2],jsonb_build_array(d1,d2)) on conflict(room_id,round,seat) do nothing;
 end if;
 return true;
end $function$;

CREATE OR REPLACE FUNCTION public.sport_challenge_review_server(p_reviewer uuid, p_user uuid, p_challenge text, p_approve boolean, p_note text DEFAULT ''::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  v_entry public.sport_challenge_entries%rowtype;
  v_challenge public.sport_challenges%rowtype;
  v_note text;
  v_awarded boolean:=false;
begin
  if p_reviewer is null or p_user is null or p_challenge is null then raise exception 'invalid_review'; end if;
  if not exists(select 1 from public.community_staff where user_id=p_reviewer) then raise exception 'staff_required'; end if;
  v_note:=left(btrim(coalesce(p_note,'')),1200);

  -- The review insert also locks member_profiles through its foreign key.
  perform pg_advisory_xact_lock(hashtextextended(p_user::text,0));
  perform pg_advisory_xact_lock(hashtextextended(p_user::text||':'||p_challenge,0));

  select * into v_entry
  from public.sport_challenge_entries
  where user_id=p_user and challenge_id=p_challenge
  for update;
  if not found or v_entry.status<>'submitted' then raise exception 'challenge_not_pending'; end if;

  select * into v_challenge from public.sport_challenges where id=p_challenge;
  if not found then raise exception 'challenge_unavailable'; end if;

  insert into public.sport_challenge_reviews(user_id,challenge_id,reviewer_id,decision,note)
  values(p_user,p_challenge,p_reviewer,case when p_approve then 'approved' else 'rejected' end,v_note);

  if p_approve then
    update public.sport_challenge_entries
    set status='verified',verified_at=now(),reviewer_id=p_reviewer,moderator_note=v_note,updated_at=now()
    where user_id=p_user and challenge_id=p_challenge
    returning * into v_entry;

    if v_challenge.xp_reward>0 then
      v_awarded:=public.loyalty_grant(
        p_user,
        'sport-challenge:'||p_challenge||':'||p_user::text,
        'sport',
        'Défi 3B · '||v_challenge.title,
        v_challenge.xp_reward,
        0
      );
    end if;
  else
    update public.sport_challenge_entries
    set status='eligible',submitted_at=null,reviewer_id=p_reviewer,moderator_note=v_note,updated_at=now()
    where user_id=p_user and challenge_id=p_challenge
    returning * into v_entry;
  end if;

  return jsonb_build_object(
    'ok',true,
    'challenge_id',p_challenge,
    'user_id',p_user,
    'status',v_entry.status,
    'xp_awarded',case when p_approve and v_awarded then v_challenge.xp_reward else 0 end
  );
end
$function$;

revoke all on function
 public.loyalty_record_purchase(uuid,text,text,bigint,bigint),
 public.loyalty_game_beat(uuid,uuid,integer),
 public.card_arena_commit(uuid,integer,jsonb),
 public.sport_challenge_review_server(uuid,uuid,text,boolean,text)
from public,anon,authenticated;
grant execute on function
 public.loyalty_record_purchase(uuid,text,text,bigint,bigint),
 public.loyalty_game_beat(uuid,uuid,integer),
 public.card_arena_commit(uuid,integer,jsonb),
 public.sport_challenge_review_server(uuid,uuid,text,boolean,text)
to service_role;

-- Refunds reverse only rewards attached to an existing server-verified purchase.
-- Keep loyalty_grant positive-only and keep the existing cumulative cents/10 rule.
-- This changes a function definition only; no purchase or balance is rewritten.
create or replace function public.loyalty_refund_purchase(
  p_intent text,
  p_refunded bigint
)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_purchase public.member_purchase_rewards%rowtype;
  v_flags public.threeb_economy_flags%rowtype;
  v_remaining integer;
  v_xp_delta integer;
  v_points_delta integer;
  v_event_key text;
  v_ledger_id bigint;
begin
  if p_refunded is null or p_refunded < 0 then
    raise exception 'invalid_loyalty_refund_amount';
  end if;

  select * into v_purchase
  from public.member_purchase_rewards
  where payment_intent = p_intent;
  if not found then return false; end if;

  -- Match the wallet's lock order: account advisory lock, wallet/profile, purchase.
  perform pg_advisory_xact_lock(hashtextextended(v_purchase.user_id::text,0));
  perform public.threeb_wallet_apply_server(v_purchase.user_id,0,0);

  select * into v_purchase
  from public.member_purchase_rewards
  where payment_intent = p_intent
  for update;
  if not found then return false; end if;

  -- The caller has already allocated the payment refund to merchandise, excluding
  -- delivery, and can never reverse more than this purchase's merchandise amount.
  if p_refunded > v_purchase.merchandise_cents then
    raise exception 'invalid_loyalty_refund_amount';
  end if;
  if p_refunded <= v_purchase.refunded_cents then return false; end if;

  v_remaining := ((v_purchase.merchandise_cents-p_refunded)/10)::integer;
  v_xp_delta := v_remaining-v_purchase.xp;
  v_points_delta := v_remaining-v_purchase.points;
  if v_xp_delta > 0 or v_points_delta > 0 then
    raise exception 'invalid_loyalty_refund_reward_state';
  end if;

  v_event_key := 'refund:'||p_intent||':'||p_refunded;
  insert into public.member_ledger(user_id,event_key,source,label,xp,points)
  values(v_purchase.user_id,v_event_key,'refund','Ajustement après remboursement',v_xp_delta,v_points_delta)
  on conflict(event_key) do nothing
  returning id into v_ledger_id;
  if v_ledger_id is null then
    -- A normal replay was handled by refunded_cents above. An isolated ledger
    -- collision must not silently advance the purchase or deduct rewards again.
    raise exception 'loyalty_refund_event_conflict';
  end if;

  select * into v_flags
  from public.threeb_economy_flags
  where singleton = true;

  insert into public.threeb_wallet_ledger
  (user_id,event_key,event_id,xp_delta,coins_delta,source,economy_version,rule_version,metadata)
  values(
    v_purchase.user_id,'loyalty:refund',v_event_key,v_xp_delta,0,'loyalty',
    coalesce(v_flags.economy_version,'2026.1'),'loyalty-refund-v1',
    jsonb_build_object(
      'label','Ajustement après remboursement',
      'points_delta',v_points_delta,
      'purchase_session_id',v_purchase.session_id,
      'payment_intent',p_intent,
      'refunded_cents',p_refunded,
      'previous_refunded_cents',v_purchase.refunded_cents
    )
  );

  if v_xp_delta <> 0 then
    insert into public.economy_transactions
    (user_id,asset,amount,kind,source,idempotency_key,metadata)
    values(
      v_purchase.user_id,'xp',v_xp_delta,'refund','loyalty','loyalty:'||v_event_key,
      jsonb_build_object(
        'source','refund',
        'purchase_session_id',v_purchase.session_id,
        'payment_intent',p_intent,
        'refunded_cents',p_refunded,
        'economy_version',coalesce(v_flags.economy_version,'2026.1')
      )
    );
  end if;

  perform public.threeb_wallet_apply_server(v_purchase.user_id,v_xp_delta,0);
  update public.member_profiles
  set points = greatest(0,points+v_points_delta)
  where user_id = v_purchase.user_id;

  update public.member_purchase_rewards
  set refunded_cents = p_refunded,points = v_remaining,xp = v_remaining
  where session_id = v_purchase.session_id;
  return true;
end
$$;

revoke all on function public.loyalty_refund_purchase(text,bigint)
from public,anon,authenticated;
grant execute on function public.loyalty_refund_purchase(text,bigint)
to service_role;

commit;
