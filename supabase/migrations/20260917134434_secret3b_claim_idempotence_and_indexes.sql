-- Secret 3B — make prize claiming strictly idempotent and add FK support indexes.

create or replace function public.secret3b_claim_phone_prize(
  p_campaign_slug text,
  p_claim_token_hash text,
  p_user_id uuid,
  p_recipient_name text,
  p_hoodie_size text,
  p_address_line1 text,
  p_address_line2 text,
  p_postal_code text,
  p_city text,
  p_country text
)
returns table(result text, winner_rank integer)
language plpgsql
security definer
set search_path = 'public', 'pg_temp'
as $$
declare
  v_campaign_id bigint;
  v_existing public.secret3b_phone_winners%rowtype;
  v_winner public.secret3b_phone_winners%rowtype;
  v_window timestamptz;
  v_attempts integer;
begin
  if p_user_id is null
     or coalesce(length(trim(p_campaign_slug)), 0) = 0
     or coalesce(length(trim(p_claim_token_hash)), 0) < 32
     or char_length(trim(coalesce(p_recipient_name,''))) not between 2 and 100
     or char_length(trim(coalesce(p_hoodie_size,''))) not between 1 and 16
     or char_length(trim(coalesce(p_address_line1,''))) not between 3 and 160
     or char_length(trim(coalesce(p_address_line2,''))) > 160
     or char_length(trim(coalesce(p_postal_code,''))) not between 2 and 24
     or char_length(trim(coalesce(p_city,''))) not between 2 and 100
     or char_length(trim(coalesce(p_country,''))) not between 2 and 80 then
    return query select 'invalid_input'::text, null::integer;
    return;
  end if;

  select id into v_campaign_id
  from public.secret3b_campaigns
  where slug = p_campaign_slug
  for update;

  if not found then
    return query select 'unavailable'::text, null::integer;
    return;
  end if;

  -- Handle an already claimed account before consuming rate-limit attempts.
  select * into v_existing
  from public.secret3b_phone_winners
  where campaign_id = v_campaign_id and claimed_by = p_user_id
  limit 1;

  if found then
    if v_existing.claim_token_hash = p_claim_token_hash then
      return query select 'claimed'::text, v_existing.winner_rank;
      return;
    end if;
    return query select 'account_already_claimed'::text, v_existing.winner_rank;
    return;
  end if;

  insert into public.secret3b_claim_rate_limits(campaign_id, user_id, window_started_at, attempt_count)
  values(v_campaign_id, p_user_id, now(), 0)
  on conflict (campaign_id, user_id) do nothing;

  select window_started_at, attempt_count into v_window, v_attempts
  from public.secret3b_claim_rate_limits
  where campaign_id = v_campaign_id and user_id = p_user_id
  for update;

  if v_window <= now() - interval '15 minutes' then
    v_window := now();
    v_attempts := 0;
    update public.secret3b_claim_rate_limits
    set window_started_at = v_window, attempt_count = 0
    where campaign_id = v_campaign_id and user_id = p_user_id;
  end if;

  if v_attempts >= 8 then
    return query select 'rate_limited'::text, null::integer;
    return;
  end if;

  update public.secret3b_claim_rate_limits
  set attempt_count = attempt_count + 1
  where campaign_id = v_campaign_id and user_id = p_user_id;

  select * into v_winner
  from public.secret3b_phone_winners
  where campaign_id = v_campaign_id and claim_token_hash = p_claim_token_hash
  for update;

  if not found then
    return query select 'invalid_code'::text, null::integer;
    return;
  end if;

  if v_winner.claimed_at is not null then
    if v_winner.claimed_by = p_user_id then
      return query select 'claimed'::text, v_winner.winner_rank;
      return;
    end if;
    return query select 'code_already_used'::text, null::integer;
    return;
  end if;

  update public.secret3b_phone_winners
  set claimed_by = p_user_id,
      claimed_at = now(),
      recipient_name = trim(p_recipient_name),
      hoodie_size = trim(p_hoodie_size),
      address_line1 = trim(p_address_line1),
      address_line2 = nullif(trim(coalesce(p_address_line2,'')), ''),
      postal_code = trim(p_postal_code),
      city = trim(p_city),
      country = trim(p_country)
  where attempt_id = v_winner.attempt_id;

  return query select 'claimed'::text, v_winner.winner_rank;
  return;
end;
$$;

revoke all on function public.secret3b_claim_phone_prize(text,text,uuid,text,text,text,text,text,text,text)
  from public, anon, authenticated;
grant execute on function public.secret3b_claim_phone_prize(text,text,uuid,text,text,text,text,text,text,text)
  to service_role;

create index if not exists secret3b_phone_winners_claimed_by_idx
  on public.secret3b_phone_winners(claimed_by)
  where claimed_by is not null;

create index if not exists secret3b_claim_rate_limits_user_idx
  on public.secret3b_claim_rate_limits(user_id);
