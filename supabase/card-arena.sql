-- Arena state is accessible only through the authenticated card-arena Edge Function.
create table public.card_arena_profiles (
 user_id uuid primary key references auth.users(id) on delete cascade,
 handle text not null,
 deck jsonb not null,
 room_id uuid,
 rating integer not null default 1000 check(rating>=0),
 wins integer not null default 0,
 losses integer not null default 0,
 mastery jsonb not null default '{}',
 reward_day date not null default current_date,
 reward_count integer not null default 0,
 seen_at timestamptz not null default now()
);
create table public.card_arena_rooms (
 id uuid primary key default gen_random_uuid(),
 code text not null unique default upper(substr(replace(gen_random_uuid()::text,'-',''),1,8)),
 mode text not null check(mode in ('ranked','friendly','tournament')),
 host uuid references auth.users(id) on delete set null,
 status text not null default 'waiting' check(status in ('waiting','active','finished','cancelled')),
 entrants jsonb not null default '[]',
 champion uuid,
 created_at timestamptz not null default now(),
 expires_at timestamptz not null default now()+interval '10 minutes'
);
create table public.card_arena_matches (
 id uuid primary key default gen_random_uuid(),
 room_id uuid not null references public.card_arena_rooms(id) on delete cascade,
 round integer not null default 1,
 seat integer not null default 0,
 p1 uuid references auth.users(id) on delete set null,
 p2 uuid references auth.users(id) on delete set null,
 decks jsonb not null,
 state jsonb,
 revision integer not null default 0,
 status text not null default 'active' check(status in ('active','finished')),
 winner uuid,
 deadline timestamptz not null default now()+interval '60 seconds',
 created_at timestamptz not null default now(),
 unique(room_id,round,seat)
);
create index card_arena_waiting on public.card_arena_rooms(mode,created_at) where status='waiting';
create index card_arena_p1 on public.card_arena_matches(p1);
create index card_arena_p2 on public.card_arena_matches(p2);
create index card_arena_host on public.card_arena_rooms(host);
alter table public.card_arena_profiles enable row level security;
alter table public.card_arena_rooms enable row level security;
alter table public.card_arena_matches enable row level security;
revoke all on public.card_arena_profiles,public.card_arena_rooms,public.card_arena_matches from public,anon,authenticated;
grant all on public.card_arena_profiles,public.card_arena_rooms,public.card_arena_matches to service_role;

create function public.card_arena_command(p_user uuid,p_action text,p_payload jsonb)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare profile public.card_arena_profiles; room public.card_arena_rooms; current_room public.card_arena_rooms; entry jsonb; capacity integer; n integer; all_matches jsonb; ranking jsonb;
begin
 perform pg_advisory_xact_lock(733303);
 if not exists(select 1 from public.member_profiles where user_id=p_user) then raise exception 'Compte 3B requis.'; end if;
 insert into public.card_arena_profiles(user_id,handle,deck)
 select p_user,handle,p_payload->'initial' from public.member_profiles where user_id=p_user
 on conflict(user_id) do update set seen_at=now();
 select * into profile from public.card_arena_profiles where user_id=p_user for update;
 update public.card_arena_rooms set status='cancelled' where status='waiting' and (expires_at<now() or (mode='ranked' and not exists(select 1 from public.card_arena_profiles p where p.user_id=host and p.seen_at>now()-interval '90 seconds')));
 select * into current_room from public.card_arena_rooms where id=profile.room_id;
 if p_action='deck' then
  if current_room.status in ('waiting','active') then raise exception 'Ton équipe est verrouillée pour cette compétition.'; end if;
  update public.card_arena_profiles set deck=p_payload->'deck' where user_id=p_user;
 elsif p_action='home' then
  if current_room.status in ('waiting','active') then raise exception 'Termine ou quitte cette compétition.'; end if;
  update public.card_arena_profiles set room_id=null where user_id=p_user;
 elsif p_action='cancel' then
  if current_room.status='active' then raise exception 'Un duel est commencé : utilise Abandonner.'; end if;
  if current_room.status='waiting' then
   if current_room.host=p_user then update public.card_arena_rooms set status='cancelled' where id=current_room.id;
   else update public.card_arena_rooms set entrants=(select coalesce(jsonb_agg(e),'[]') from jsonb_array_elements(entrants) e where e->>'uid'<>p_user::text) where id=current_room.id; end if;
  end if;
  update public.card_arena_profiles set room_id=null where user_id=p_user;
 elsif p_action in ('create','join','queue') then
  if current_room.status in ('waiting','active') then return jsonb_build_object('room',to_jsonb(current_room),'profile',to_jsonb(profile),'matches',(select coalesce(jsonb_agg(m order by round,seat),'[]') from public.card_arena_matches m where room_id=current_room.id)); end if;
  entry=jsonb_build_object('uid',p_user,'handle',profile.handle,'deck',profile.deck);
  if p_action='join' then
   select * into room from public.card_arena_rooms where code=upper(p_payload->>'code') and mode<>'ranked' and status='waiting' and expires_at>now() for update;
   if room.id is null then raise exception 'Ce code est introuvable, complet ou expiré.'; end if;
  elsif p_action='queue' then
   select r.* into room from public.card_arena_rooms r join public.card_arena_profiles p on p.user_id=r.host
   where r.mode='ranked' and r.status='waiting' and r.host<>p_user and r.expires_at>now() and p.seen_at>now()-interval '30 seconds'
   order by abs(p.rating-profile.rating),r.created_at limit 1 for update of r;
  end if;
  if room.id is null then
   if (select count(*) from public.card_arena_rooms where host=p_user and created_at>now()-interval '10 minutes')>=12 then raise exception 'Tu as ouvert plusieurs salons. Réessaie dans quelques minutes.'; end if;
   if p_action='create' and (p_payload->>'mode') not in ('friendly','tournament') then raise exception 'Mode inconnu.'; end if;
   insert into public.card_arena_rooms(mode,host,entrants) values(case when p_action='queue' then 'ranked' else p_payload->>'mode' end,p_user,jsonb_build_array(entry)) returning * into room;
  else
   if room.entrants @> jsonb_build_array(jsonb_build_object('uid',p_user::text)) then raise exception 'Tu es déjà dans ce salon.'; end if;
   update public.card_arena_rooms set entrants=entrants||jsonb_build_array(entry) where id=room.id returning * into room;
  end if;
  update public.card_arena_profiles set room_id=room.id where user_id=p_user;
  capacity=case when room.mode='tournament' then 4 else 2 end;
  if jsonb_array_length(room.entrants)=capacity then
   update public.card_arena_rooms set status='active' where id=room.id;
   for n in 0..(capacity/2-1) loop
    insert into public.card_arena_matches(room_id,round,seat,p1,p2,decks) values(room.id,1,n,(room.entrants->(n*2)->>'uid')::uuid,(room.entrants->(n*2+1)->>'uid')::uuid,jsonb_build_array(room.entrants->(n*2)->'deck',room.entrants->(n*2+1)->'deck'));
   end loop;
  end if;
 elsif p_action<>'status' then raise exception 'Action inconnue.';
 end if;
 select * into profile from public.card_arena_profiles where user_id=p_user;
 select * into room from public.card_arena_rooms where id=profile.room_id;
 select coalesce(jsonb_agg(m order by round,seat),'[]') into all_matches from public.card_arena_matches m where room_id=room.id;
 select coalesce(jsonb_agg(t),'[]') into ranking from (select handle,rating,wins from public.card_arena_profiles where wins+losses>0 order by rating desc,wins desc,handle limit 10) t;
 return jsonb_build_object('profile',to_jsonb(profile),'room',case when room.id is null then null else to_jsonb(room) end,'matches',all_matches,'ranking',ranking,'serverTime',now());
end $$;
revoke all on function public.card_arena_command(uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.card_arena_command(uuid,text,jsonb) to service_role;

create function public.card_arena_commit(p_match uuid,p_revision integer,p_state jsonb)
returns boolean language plpgsql security invoker set search_path='' as $$
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
end $$;
revoke all on function public.card_arena_commit(uuid,integer,jsonb) from public,anon,authenticated;
grant execute on function public.card_arena_commit(uuid,integer,jsonb) to service_role;
