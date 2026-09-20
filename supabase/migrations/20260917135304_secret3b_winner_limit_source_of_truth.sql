create or replace function public.secret3b_claim_phone_answer(
  p_campaign_slug text,
  p_call_sid text,
  p_caller_hash text,
  p_digit text,
  p_claim_token_hash text,
  p_caller_ciphertext text default null
)
returns table(result text, winner_rank integer, max_winners integer)
language plpgsql
security definer
set search_path = 'public', 'pg_temp'
as $$
declare
  v_campaign_id bigint;
  v_status text;
  v_enabled boolean;
  v_correct_digit text;
  v_max_winners integer;
  v_opens_at timestamptz;
  v_closes_at timestamptz;
  v_existing public.secret3b_phone_attempts%rowtype;
  v_winner_count integer;
  v_attempt_id bigint;
  v_rank integer;
begin
  if coalesce(length(trim(p_campaign_slug)),0) = 0
     or coalesce(length(trim(p_call_sid)),0) = 0
     or coalesce(length(trim(p_caller_hash)),0) = 0
     or p_digit is null
     or p_digit not in ('1','2') then
    return query select 'invalid'::text, null::integer, null::integer;
    return;
  end if;

  -- Campaign prize_count is the single source of truth for the real winner cap.
  select c.id, c.status, pc.enabled, pc.correct_digit, c.prize_count, pc.opens_at, pc.closes_at
    into v_campaign_id, v_status, v_enabled, v_correct_digit, v_max_winners, v_opens_at, v_closes_at
  from public.secret3b_campaigns c
  join public.secret3b_phone_contests pc on pc.campaign_id = c.id
  where c.slug = p_campaign_slug
  for update of c, pc;

  if not found then
    return query select 'unavailable'::text, null::integer, null::integer;
    return;
  end if;

  select * into v_existing
  from public.secret3b_phone_attempts
  where campaign_id = v_campaign_id and call_sid = p_call_sid;

  if found then
    return query select v_existing.outcome::text, v_existing.winner_rank, v_max_winners;
    return;
  end if;

  select * into v_existing
  from public.secret3b_phone_attempts
  where campaign_id = v_campaign_id and caller_hash = p_caller_hash;

  if found then
    return query select 'duplicate'::text, v_existing.winner_rank, v_max_winners;
    return;
  end if;

  if v_status <> 'active'
     or not v_enabled
     or v_correct_digit is null
     or (v_opens_at is not null and now() < v_opens_at)
     or (v_closes_at is not null and now() >= v_closes_at) then
    return query select 'unavailable'::text, null::integer, v_max_winners;
    return;
  end if;

  if p_digit <> v_correct_digit then
    insert into public.secret3b_phone_attempts(campaign_id, call_sid, caller_hash, digit, outcome)
    values(v_campaign_id, p_call_sid, p_caller_hash, p_digit, 'wrong');
    return query select 'wrong'::text, null::integer, v_max_winners;
    return;
  end if;

  select count(*)::integer into v_winner_count
  from public.secret3b_phone_attempts
  where campaign_id = v_campaign_id and outcome = 'winner';

  if v_winner_count >= v_max_winners then
    insert into public.secret3b_phone_attempts(campaign_id, call_sid, caller_hash, digit, outcome)
    values(v_campaign_id, p_call_sid, p_caller_hash, p_digit, 'correct_too_late');
    return query select 'correct_too_late'::text, null::integer, v_max_winners;
    return;
  end if;

  if coalesce(length(trim(p_claim_token_hash)),0) < 32 then
    return query select 'invalid'::text, null::integer, v_max_winners;
    return;
  end if;

  v_rank := v_winner_count + 1;

  insert into public.secret3b_phone_attempts(campaign_id, call_sid, caller_hash, digit, outcome, winner_rank)
  values(v_campaign_id, p_call_sid, p_caller_hash, p_digit, 'winner', v_rank)
  returning id into v_attempt_id;

  insert into public.secret3b_phone_winners(attempt_id, campaign_id, winner_rank, claim_token_hash, caller_ciphertext)
  values(v_attempt_id, v_campaign_id, v_rank, p_claim_token_hash, p_caller_ciphertext);

  return query select 'winner'::text, v_rank, v_max_winners;
  return;
end;
$$;

revoke all on function public.secret3b_claim_phone_answer(text,text,text,text,text,text) from public, anon, authenticated;
grant execute on function public.secret3b_claim_phone_answer(text,text,text,text,text,text) to service_role;

update public.secret3b_phone_contests pc
set max_winners = c.prize_count,
    updated_at = now()
from public.secret3b_campaigns c
where c.id = pc.campaign_id and pc.max_winners is distinct from c.prize_count;
