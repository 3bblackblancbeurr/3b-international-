begin;

create table public.sport_challenges(
  id text primary key check(id ~ '^[a-z0-9-]{3,50}$'),
  title text not null check(length(title) between 3 and 120),
  tag text not null check(length(tag) between 2 and 40),
  description text not null check(length(description) between 10 and 700),
  tracker text not null check(tracker in ('daily_minutes','steps','event','session')),
  target_value numeric(12,2) not null check(target_value > 0),
  daily_minimum numeric(12,2) check(daily_minimum is null or daily_minimum > 0),
  unit text not null check(length(unit) between 1 and 24),
  xp_reward integer not null default 0 check(xp_reward between 0 and 5000),
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check((tracker='daily_minutes' and daily_minimum is not null) or (tracker<>'daily_minutes' and daily_minimum is null))
);

create table public.sport_challenge_entries(
  user_id uuid not null references public.member_profiles(user_id) on delete cascade,
  challenge_id text not null references public.sport_challenges(id) on delete cascade,
  status text not null default 'joined' check(status in ('joined','eligible','submitted','verified','abandoned')),
  progress numeric(12,2) not null default 0 check(progress >= 0),
  joined_at timestamptz not null default now(),
  eligible_at timestamptz,
  submitted_at timestamptz,
  verified_at timestamptz,
  proof_note text check(proof_note is null or length(proof_note)<=1200),
  moderator_note text check(moderator_note is null or length(moderator_note)<=1200),
  reviewer_id uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  primary key(user_id,challenge_id)
);

create table public.sport_challenge_checkins(
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.member_profiles(user_id) on delete cascade,
  challenge_id text not null references public.sport_challenges(id) on delete cascade,
  challenge_day date not null default ((now() at time zone 'UTC')::date),
  value numeric(12,2) not null check(value >= 0 and value <= 10000000),
  note text not null default '' check(length(note)<=500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id,challenge_id,challenge_day)
);

create table public.sport_challenge_reviews(
  id bigint generated always as identity primary key,
  user_id uuid not null references public.member_profiles(user_id) on delete cascade,
  challenge_id text not null references public.sport_challenges(id) on delete cascade,
  reviewer_id uuid not null references auth.users(id) on delete restrict,
  decision text not null check(decision in ('approved','rejected')),
  note text not null default '' check(length(note)<=1200),
  created_at timestamptz not null default now()
);

create index sport_challenge_entries_status_idx on public.sport_challenge_entries(status,updated_at desc);
create index sport_challenge_entries_user_idx on public.sport_challenge_entries(user_id,updated_at desc);
create index sport_challenge_checkins_user_idx on public.sport_challenge_checkins(user_id,challenge_id,challenge_day desc);
create index sport_challenge_reviews_pending_audit_idx on public.sport_challenge_reviews(user_id,challenge_id,created_at desc);

alter table public.sport_challenges enable row level security;
alter table public.sport_challenge_entries enable row level security;
alter table public.sport_challenge_checkins enable row level security;
alter table public.sport_challenge_reviews enable row level security;

revoke all on public.sport_challenges,public.sport_challenge_entries,public.sport_challenge_checkins,public.sport_challenge_reviews from public,anon,authenticated;
grant select,insert,update,delete on public.sport_challenges,public.sport_challenge_entries,public.sport_challenge_checkins,public.sport_challenge_reviews to service_role;
grant usage,select on sequence public.sport_challenge_reviews_id_seq to service_role;

insert into public.sport_challenges(id,title,tag,description,tracker,target_value,daily_minimum,unit,xp_reward,sort_order)
values
 ('move-30x7','30 minutes · 7 jours','RÉGULARITÉ','Bouge au moins 30 minutes par jour pendant sept jours distincts. Le serveur ne compte qu’un check-in par jour UTC.','daily_minutes',7,30,'jours validés',120,10),
 ('steps-10000','10 000 pas collectif','ENDURANCE','Atteins au moins 10 000 pas sur une journée puis soumets ton résultat à la validation 3B.','steps',10000,null,'pas',60,20),
 ('local-match','Match local 3B','RENCONTRE','Participe réellement à une rencontre sportive locale puis décris l’événement pour validation.','event',1,null,'rencontre',100,30),
 ('new-sport','Découvre un nouveau sport','EXPLORATION','Teste une discipline nouvelle pour toi et raconte brièvement l’expérience avant validation.','session',1,null,'session',80,40)
on conflict(id) do update set
 title=excluded.title,
 tag=excluded.tag,
 description=excluded.description,
 tracker=excluded.tracker,
 target_value=excluded.target_value,
 daily_minimum=excluded.daily_minimum,
 unit=excluded.unit,
 xp_reward=excluded.xp_reward,
 sort_order=excluded.sort_order,
 updated_at=now();

create or replace function public.sport_challenge_join_server(p_user uuid,p_challenge text)
returns jsonb
language plpgsql
security invoker
set search_path=''
as $$
declare
  v_challenge public.sport_challenges%rowtype;
  v_entry public.sport_challenge_entries%rowtype;
begin
  if p_user is null or p_challenge is null then raise exception 'invalid_challenge_request'; end if;
  if not exists(select 1 from public.member_profiles where user_id=p_user) then raise exception 'member_required'; end if;

  select * into v_challenge from public.sport_challenges where id=p_challenge and active=true;
  if not found then raise exception 'challenge_unavailable'; end if;

  perform pg_advisory_xact_lock(hashtextextended(p_user::text||':'||p_challenge,0));

  insert into public.sport_challenge_entries(user_id,challenge_id,status)
  values(p_user,p_challenge,'joined')
  on conflict(user_id,challenge_id) do update set
    status=case
      when sport_challenge_entries.status in ('verified','submitted') then sport_challenge_entries.status
      else 'joined'
    end,
    updated_at=now()
  returning * into v_entry;

  return jsonb_build_object(
    'ok',true,
    'challenge_id',v_entry.challenge_id,
    'status',v_entry.status,
    'progress',v_entry.progress,
    'target',v_challenge.target_value,
    'unit',v_challenge.unit
  );
end
$$;

create or replace function public.sport_challenge_checkin_server(
  p_user uuid,
  p_challenge text,
  p_value numeric,
  p_note text default ''
)
returns jsonb
language plpgsql
security invoker
set search_path=''
as $$
declare
  v_challenge public.sport_challenges%rowtype;
  v_entry public.sport_challenge_entries%rowtype;
  v_progress numeric(12,2):=0;
  v_value numeric(12,2);
  v_note text;
begin
  if p_user is null or p_challenge is null or p_value is null or p_value<0 or p_value>10000000 then
    raise exception 'invalid_checkin';
  end if;
  v_note:=left(coalesce(p_note,''),500);

  select * into v_challenge from public.sport_challenges where id=p_challenge and active=true;
  if not found then raise exception 'challenge_unavailable'; end if;

  perform pg_advisory_xact_lock(hashtextextended(p_user::text||':'||p_challenge,0));

  select * into v_entry
  from public.sport_challenge_entries
  where user_id=p_user and challenge_id=p_challenge
  for update;
  if not found then raise exception 'challenge_not_joined'; end if;
  if v_entry.status='verified' then raise exception 'challenge_already_verified'; end if;
  if v_entry.status='submitted' then raise exception 'challenge_under_review'; end if;
  if v_entry.status='abandoned' then raise exception 'challenge_abandoned'; end if;

  v_value:=case when v_challenge.tracker in ('event','session') then 1 else p_value end;

  insert into public.sport_challenge_checkins(user_id,challenge_id,challenge_day,value,note)
  values(p_user,p_challenge,(now() at time zone 'UTC')::date,v_value,v_note)
  on conflict(user_id,challenge_id,challenge_day) do update set
    value=greatest(public.sport_challenge_checkins.value,excluded.value),
    note=case when excluded.note<>'' then excluded.note else public.sport_challenge_checkins.note end,
    updated_at=now();

  if v_challenge.tracker='daily_minutes' then
    select count(*)::numeric into v_progress
    from public.sport_challenge_checkins
    where user_id=p_user and challenge_id=p_challenge and value>=v_challenge.daily_minimum;
  elsif v_challenge.tracker='steps' then
    select coalesce(max(value),0) into v_progress
    from public.sport_challenge_checkins
    where user_id=p_user and challenge_id=p_challenge;
  else
    select count(*)::numeric into v_progress
    from public.sport_challenge_checkins
    where user_id=p_user and challenge_id=p_challenge and value>=1;
  end if;

  v_progress:=least(v_progress,v_challenge.target_value);

  update public.sport_challenge_entries
  set progress=v_progress,
      status=case when v_progress>=v_challenge.target_value then 'eligible' else 'joined' end,
      eligible_at=case when v_progress>=v_challenge.target_value then coalesce(eligible_at,now()) else eligible_at end,
      moderator_note=null,
      updated_at=now()
  where user_id=p_user and challenge_id=p_challenge
  returning * into v_entry;

  return jsonb_build_object(
    'ok',true,
    'challenge_id',p_challenge,
    'status',v_entry.status,
    'progress',v_entry.progress,
    'target',v_challenge.target_value,
    'unit',v_challenge.unit,
    'eligible',v_entry.status='eligible'
  );
end
$$;

create or replace function public.sport_challenge_submit_server(
  p_user uuid,
  p_challenge text,
  p_proof text
)
returns jsonb
language plpgsql
security invoker
set search_path=''
as $$
declare
  v_entry public.sport_challenge_entries%rowtype;
  v_proof text;
begin
  v_proof:=btrim(coalesce(p_proof,''));
  if p_user is null or p_challenge is null or length(v_proof)<10 or length(v_proof)>1200 then
    raise exception 'challenge_proof_required';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_user::text||':'||p_challenge,0));

  select * into v_entry
  from public.sport_challenge_entries
  where user_id=p_user and challenge_id=p_challenge
  for update;
  if not found then raise exception 'challenge_not_joined'; end if;
  if v_entry.status='verified' then raise exception 'challenge_already_verified'; end if;
  if v_entry.status<>'eligible' then raise exception 'challenge_target_not_reached'; end if;

  update public.sport_challenge_entries
  set status='submitted',proof_note=v_proof,submitted_at=now(),moderator_note=null,updated_at=now()
  where user_id=p_user and challenge_id=p_challenge
  returning * into v_entry;

  return jsonb_build_object('ok',true,'challenge_id',p_challenge,'status',v_entry.status,'submitted_at',v_entry.submitted_at);
end
$$;

create or replace function public.sport_challenge_abandon_server(p_user uuid,p_challenge text)
returns jsonb
language plpgsql
security invoker
set search_path=''
as $$
declare
  v_entry public.sport_challenge_entries%rowtype;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_user::text||':'||p_challenge,0));
  select * into v_entry
  from public.sport_challenge_entries
  where user_id=p_user and challenge_id=p_challenge
  for update;
  if not found then raise exception 'challenge_not_joined'; end if;
  if v_entry.status in ('submitted','verified') then raise exception 'challenge_locked'; end if;

  update public.sport_challenge_entries
  set status='abandoned',updated_at=now()
  where user_id=p_user and challenge_id=p_challenge
  returning * into v_entry;

  return jsonb_build_object('ok',true,'challenge_id',p_challenge,'status',v_entry.status);
end
$$;

create or replace function public.sport_challenge_review_server(
  p_reviewer uuid,
  p_user uuid,
  p_challenge text,
  p_approve boolean,
  p_note text default ''
)
returns jsonb
language plpgsql
security invoker
set search_path=''
as $$
declare
  v_entry public.sport_challenge_entries%rowtype;
  v_challenge public.sport_challenges%rowtype;
  v_note text;
  v_awarded boolean:=false;
begin
  if p_reviewer is null or p_user is null or p_challenge is null then raise exception 'invalid_review'; end if;
  if not exists(select 1 from public.community_staff where user_id=p_reviewer) then raise exception 'staff_required'; end if;
  v_note:=left(btrim(coalesce(p_note,'')),1200);

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
$$;

revoke all on function public.sport_challenge_join_server(uuid,text) from public,anon,authenticated;
revoke all on function public.sport_challenge_checkin_server(uuid,text,numeric,text) from public,anon,authenticated;
revoke all on function public.sport_challenge_submit_server(uuid,text,text) from public,anon,authenticated;
revoke all on function public.sport_challenge_abandon_server(uuid,text) from public,anon,authenticated;
revoke all on function public.sport_challenge_review_server(uuid,uuid,text,boolean,text) from public,anon,authenticated;

grant execute on function public.sport_challenge_join_server(uuid,text) to service_role;
grant execute on function public.sport_challenge_checkin_server(uuid,text,numeric,text) to service_role;
grant execute on function public.sport_challenge_submit_server(uuid,text,text) to service_role;
grant execute on function public.sport_challenge_abandon_server(uuid,text) to service_role;
grant execute on function public.sport_challenge_review_server(uuid,uuid,text,boolean,text) to service_role;

commit;