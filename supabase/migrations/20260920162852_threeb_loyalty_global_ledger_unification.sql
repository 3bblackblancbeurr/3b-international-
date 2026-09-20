-- Applied Supabase migration: 20260920162852
-- Unifies loyalty/game XP with the authoritative economy ledger.

create or replace function public.loyalty_grant(
  p_user uuid,
  p_key text,
  p_source text,
  p_label text,
  p_xp integer,
  p_points integer
)
returns boolean
language plpgsql
set search_path = ''
as $$
declare
  v_wallet jsonb;
  v_flags public.threeb_economy_flags%rowtype;
  v_idempotency text;
begin
  if p_user is null
     or p_key is null or length(p_key) < 3 or length(p_key) > 180
     or p_source is null or length(p_source) < 2 or length(p_source) > 40
     or p_label is null or length(p_label) < 2 or length(p_label) > 160
     or p_xp < 0 or p_xp > 100000
     or p_points < 0 or p_points > 10000 then
    raise exception 'invalid_loyalty_grant';
  end if;

  if not exists(select 1 from public.member_profiles where user_id=p_user) then
    raise exception 'Profil introuvable';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_user::text,0));
  v_wallet := public.threeb_wallet_apply_server(p_user,0,0);

  insert into public.member_ledger(user_id,event_key,source,label,xp,points)
  values(p_user,p_key,p_source,p_label,p_xp,p_points)
  on conflict(event_key) do nothing;

  if not found then return false; end if;

  select * into v_flags
  from public.threeb_economy_flags
  where singleton=true;

  insert into public.threeb_wallet_ledger
  (user_id,event_key,event_id,xp_delta,coins_delta,source,economy_version,rule_version,metadata)
  values(
    p_user,'loyalty:'||p_source,p_key,p_xp,0,'loyalty',
    coalesce(v_flags.economy_version,'2026.1'),'loyalty-v1',
    jsonb_build_object('label',p_label,'points_delta',p_points)
  );

  v_idempotency := 'loyalty:'||p_key;

  if p_xp <> 0 then
    insert into public.economy_transactions
    (user_id,asset,amount,kind,source,idempotency_key,metadata)
    values(
      p_user,'xp',p_xp,'earn','loyalty',v_idempotency,
      jsonb_build_object('source',p_source,'label',p_label,'economy_version',coalesce(v_flags.economy_version,'2026.1'))
    );
  end if;

  v_wallet := public.threeb_wallet_apply_server(p_user,p_xp,0);

  update public.member_profiles
  set points=greatest(0,points+p_points)
  where user_id=p_user;

  return true;
end
$$;

revoke all on function public.loyalty_grant(uuid,text,text,text,integer,integer)
from public, anon, authenticated;
grant execute on function public.loyalty_grant(uuid,text,text,text,integer,integer)
to service_role;
