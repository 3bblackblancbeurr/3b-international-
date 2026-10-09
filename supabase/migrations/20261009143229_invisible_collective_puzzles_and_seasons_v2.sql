-- Real collective puzzles. Dates and completions are server state, never client clocks.
begin;
create table public.invisible_echo_solutions (
 user_id uuid primary key references auth.users(id) on delete cascade,
 solved_at timestamptz not null default now()
);
create table public.invisible_events (
 code text primary key check(code ~ '^echoes-[a-z]+-20[0-9]{2}$'),
 title text not null,starts_at timestamptz not null,ends_at timestamptz not null,
 solution text not null check(solution ~ '^[A-Z]{8}$'),clue text not null,
 completed_at timestamptz,check(ends_at>starts_at)
);
create table public.invisible_event_contributions (
 event_code text not null references public.invisible_events(code),
 user_id uuid not null references auth.users(id) on delete cascade,
 realm text not null check(realm in ('france','algerie','maroc','tunisie','espagne','italie','turquie','estonie')),
 created_at timestamptz not null default now(),primary key(event_code,user_id)
);
create table public.invisible_event_solutions (
 event_code text not null references public.invisible_events(code),
 user_id uuid not null references auth.users(id) on delete cascade,
 solved_at timestamptz not null default now(),primary key(event_code,user_id)
);
alter table public.invisible_echo_solutions enable row level security;
alter table public.invisible_events enable row level security;
alter table public.invisible_event_contributions enable row level security;
alter table public.invisible_event_solutions enable row level security;
revoke all on public.invisible_echo_solutions,public.invisible_events,public.invisible_event_contributions,public.invisible_event_solutions from public,anon,authenticated;
grant select,insert on public.invisible_echo_solutions,public.invisible_event_contributions,public.invisible_event_solutions to service_role;
grant select on public.invisible_events to service_role;
grant update(completed_at) on public.invisible_events to service_role;

insert into public.invisible_events(code,title,starts_at,ends_at,solution,clue) values
 ('echoes-autumn-2026','La saison du Lien','2026-10-09T00:00:00Z','2026-12-01T00:00:00Z','ENSEMBLE','Le Cercle ne se répare pas seul : réunis les lettres dans l’ordre des huit royaumes. Le mot décrit notre manière d’avancer.'),
 ('echoes-winter-2026','La veille des liens','2026-12-01T00:00:00Z','2027-03-01T00:00:00Z','PARTAGER','Ce que chacun garde séparément peut devenir une force commune. Assemble les huit lettres dans l’ordre des royaumes.'),
 ('echoes-spring-2027','Le retour des voix','2027-03-01T00:00:00Z','2027-06-01T00:00:00Z','ENSEMBLE','Huit voix peuvent porter un même geste : découvre le mot en réunissant leurs lettres.'),
 ('echoes-summer-2027','La route des échos','2027-06-01T00:00:00Z','2027-09-01T00:00:00Z','TRANSMET','Ce que le Cercle reçoit doit continuer sa route. Assemble les huit lettres dans l’ordre des royaumes.'),
 ('echoes-autumn-2027','L’archive des passages','2027-09-01T00:00:00Z','2027-12-01T00:00:00Z','ENSEMBLE','Aucun héritage ne restaure le Lien à lui seul : les huit lettres racontent comment poursuivre.')
on conflict(code) do nothing;

create function public.invisible_member_check(p_user uuid,p_session uuid) returns void language plpgsql security invoker set search_path='' as $$
begin
 if not coalesce(public.loyalty_session_valid(p_user,p_session),false) then raise exception 'session_expired' using errcode='28000'; end if;
 perform 1 from public.member_profiles where user_id=p_user and passport_state='active';
 if not found then raise exception 'passport_required' using errcode='P0001'; end if;
end;$$;
create function public.invisible_echo_eligible(p_user uuid) returns boolean language sql security invoker set search_path='' as $$
 select exists(select 1 from public.member_world_state w join public.member_profiles p using(user_id)
  where w.user_id=p_user and p.passport_state='active' and w.data#>>'{invisible,started}'='true'
   and w.data#>'{invisible,solved}'='["rive","balance","preuve"]'::jsonb and w.data#>>'{invisible,chestOpened}'='true');
$$;

create or replace function public.invisible_echo_snapshot(p_user uuid,p_session uuid) returns jsonb language plpgsql security invoker set search_path='' as $$
declare own_realm text;echoes jsonb;letters jsonb;covered integer;solution_at timestamptz;
begin
 if not coalesce(public.loyalty_session_valid(p_user,p_session),false) then raise exception 'session_expired' using errcode='28000'; end if;
 select realm into own_realm from public.invisible_echo_contributions where user_id=p_user;
 select solved_at into solution_at from public.invisible_echo_solutions where user_id=p_user;
 select jsonb_agg(jsonb_build_object('realm',r.realm,'contributors',coalesce(c.n,0)) order by r.position),
  jsonb_agg(jsonb_build_object('realm',r.realm,'position',r.position,'symbol',case when coalesce(c.n,0)>0 then substring('TRANSMET',r.position,1) else null end) order by r.position),
  count(*) filter(where coalesce(c.n,0)>0)
 into echoes,letters,covered from (values ('france',1),('algerie',2),('maroc',3),('tunisie',4),('espagne',5),('italie',6),('turquie',7),('estonie',8))r(realm,position)
 left join(select realm,count(*) n from public.invisible_echo_contributions group by realm)c on c.realm=r.realm;
 return jsonb_build_object('mission','eight-echoes-001','realms',echoes,'covered',covered,'required',8,'awakened',covered=8,
  'contributedRealm',own_realm,'eligible',public.invisible_echo_eligible(p_user),'contributors',(select count(*) from public.invisible_echo_contributions),
  'puzzle',jsonb_build_object('letters',letters,'clue','Assemble les huit lettres dans l’ordre des royaumes. Le mot dit ce que le Lien fait passer d’un héritage à l’autre.',
   'unlocked',covered=8,'solved',solution_at is not null,'solvedAt',solution_at));
end;$$;

create function public.invisible_echo_solve(p_user uuid,p_session uuid,p_answer text) returns jsonb language plpgsql security invoker set search_path='' as $$
declare covered integer;
begin
 perform public.invisible_member_check(p_user,p_session);
 -- Each personal resolution is immutable; a replay remains a read, not another grant.
 if exists(select 1 from public.invisible_echo_solutions where user_id=p_user) then return public.invisible_echo_snapshot(p_user,p_session); end if;
 if not public.invisible_echo_eligible(p_user) then raise exception 'fragment_required' using errcode='P0001'; end if;
 if not exists(select 1 from public.invisible_echo_contributions where user_id=p_user) then raise exception 'contribution_required' using errcode='P0001'; end if;
 select count(distinct realm) into covered from public.invisible_echo_contributions;
 if covered<>8 then raise exception 'echoes_incomplete' using errcode='P0001'; end if;
 if p_answer is null or length(p_answer)>48 or upper(trim(p_answer))<>'TRANSMET' then raise exception 'invalid_answer' using errcode='P0001'; end if;
 insert into public.invisible_echo_solutions(user_id) values(p_user) on conflict(user_id) do nothing;
 return public.invisible_echo_snapshot(p_user,p_session);
end;$$;

create function public.invisible_event_snapshot(p_user uuid,p_session uuid,p_event text default null) returns jsonb language plpgsql security invoker set search_path='' as $$
declare event public.invisible_events%rowtype;own_realm text;echoes jsonb;letters jsonb;covered integer;solution_at timestamptz;phase text;
begin
 perform public.invisible_member_check(p_user,p_session);
 if p_event is null then
  select * into event from public.invisible_events order by case when starts_at<=now() and ends_at>now() then 0 when starts_at>now() then 1 else 2 end,
   case when starts_at>now() then starts_at end asc,starts_at desc limit 1;
 else select * into event from public.invisible_events where code=p_event; end if;
 if not found then raise exception 'event_unavailable' using errcode='P0001'; end if;
 select realm into own_realm from public.invisible_event_contributions where event_code=event.code and user_id=p_user;
 select solved_at into solution_at from public.invisible_event_solutions where event_code=event.code and user_id=p_user;
 select jsonb_agg(jsonb_build_object('realm',r.realm,'contributors',coalesce(c.n,0)) order by r.position),
  jsonb_agg(jsonb_build_object('realm',r.realm,'position',r.position,'symbol',case when coalesce(c.n,0)>0 then substring(event.solution,r.position,1) else null end) order by r.position),
  count(*) filter(where coalesce(c.n,0)>0)
 into echoes,letters,covered from (values ('france',1),('algerie',2),('maroc',3),('tunisie',4),('espagne',5),('italie',6),('turquie',7),('estonie',8))r(realm,position)
 left join(select realm,count(*) n from public.invisible_event_contributions where event_code=event.code group by realm)c on c.realm=r.realm;
 phase:=case when now()<event.starts_at then 'upcoming' when event.completed_at is not null then 'complete' when now()>=event.ends_at then 'closed' else 'open' end;
 return jsonb_build_object('event',event.code,'title',event.title,'serverNow',now(),'startsAt',event.starts_at,'endsAt',event.ends_at,
  'phase',phase,'completedAt',event.completed_at,'realms',echoes,'covered',covered,'required',8,'awakened',covered=8,
  'contributedRealm',own_realm,'eligible',public.invisible_echo_eligible(p_user),'participationOpen',event.starts_at<=now() and event.ends_at>now(),
  'contributors',(select count(*) from public.invisible_event_contributions where event_code=event.code),
  'puzzle',jsonb_build_object('letters',letters,'clue',event.clue,'unlocked',covered=8,'solved',solution_at is not null,'solvedAt',solution_at),
  'calendar',(select jsonb_agg(jsonb_build_object('event',e.code,'title',e.title,'startsAt',e.starts_at,'endsAt',e.ends_at,
   'phase',case when now()<e.starts_at then 'upcoming' when e.completed_at is not null then 'complete' when now()>=e.ends_at then 'closed' else 'open' end) order by e.starts_at) from public.invisible_events e));
end;$$;

create function public.invisible_event_contribute(p_user uuid,p_session uuid,p_event text,p_realm text default null) returns jsonb language plpgsql security invoker set search_path='' as $$
declare event public.invisible_events%rowtype;selected text;previous text;country text;
begin
 perform public.invisible_member_check(p_user,p_session);
 select * into event from public.invisible_events where code=p_event;
 if not found then raise exception 'event_unavailable' using errcode='P0001'; end if;
 if now()<event.starts_at or now()>=event.ends_at then raise exception 'event_not_open' using errcode='P0001'; end if;
 -- Same account-state lock as the permanent mission, so competing realm choices serialize.
 perform 1 from public.member_world_state where user_id=p_user for update;
 if not public.invisible_echo_eligible(p_user) then raise exception 'fragment_required' using errcode='P0001'; end if;
 select p.country into country from public.member_profiles p where p.user_id=p_user;
 selected:=coalesce(p_realm,case country when 'France' then 'france' when 'Algérie' then 'algerie' when 'Maroc' then 'maroc' when 'Tunisie' then 'tunisie' when 'Espagne' then 'espagne' when 'Italie' then 'italie' when 'Turquie' then 'turquie' when 'Estonie' then 'estonie' end);
 if selected is null or selected not in ('france','algerie','maroc','tunisie','espagne','italie','turquie','estonie') then raise exception 'invalid_realm' using errcode='P0001'; end if;
 select realm into previous from public.invisible_event_contributions where event_code=event.code and user_id=p_user;
 if previous is not null and previous<>selected then raise exception 'realm_locked' using errcode='P0001'; end if;
 insert into public.invisible_event_contributions(event_code,user_id,realm) values(event.code,p_user,selected) on conflict(event_code,user_id) do nothing;
 return public.invisible_event_snapshot(p_user,p_session,event.code);
end;$$;

create function public.invisible_event_solve(p_user uuid,p_session uuid,p_event text,p_answer text) returns jsonb language plpgsql security invoker set search_path='' as $$
declare event public.invisible_events%rowtype;covered integer;
begin
 perform public.invisible_member_check(p_user,p_session);
 select * into event from public.invisible_events where code=p_event;
 if not found then raise exception 'event_unavailable' using errcode='P0001'; end if;
 if exists(select 1 from public.invisible_event_solutions where event_code=event.code and user_id=p_user) then return public.invisible_event_snapshot(p_user,p_session,event.code); end if;
 if now()<event.starts_at or now()>=event.ends_at then raise exception 'event_not_open' using errcode='P0001'; end if;
 if not public.invisible_echo_eligible(p_user) then raise exception 'fragment_required' using errcode='P0001'; end if;
 if not exists(select 1 from public.invisible_event_contributions where event_code=event.code and user_id=p_user) then raise exception 'contribution_required' using errcode='P0001'; end if;
 select count(distinct realm) into covered from public.invisible_event_contributions where event_code=event.code;
 if covered<>8 then raise exception 'echoes_incomplete' using errcode='P0001'; end if;
 if p_answer is null or length(p_answer)>48 or upper(trim(p_answer))<>event.solution then raise exception 'invalid_answer' using errcode='P0001'; end if;
 insert into public.invisible_event_solutions(event_code,user_id) values(event.code,p_user) on conflict(event_code,user_id) do nothing;
 update public.invisible_events set completed_at=coalesce(completed_at,now()) where code=event.code;
 return public.invisible_event_snapshot(p_user,p_session,event.code);
end;$$;

revoke all on function public.invisible_member_check(uuid,uuid),public.invisible_echo_eligible(uuid),public.invisible_echo_snapshot(uuid,uuid),public.invisible_echo_solve(uuid,uuid,text),public.invisible_event_snapshot(uuid,uuid,text),public.invisible_event_contribute(uuid,uuid,text,text),public.invisible_event_solve(uuid,uuid,text,text) from public,anon,authenticated;
grant execute on function public.invisible_member_check(uuid,uuid),public.invisible_echo_eligible(uuid),public.invisible_echo_snapshot(uuid,uuid),public.invisible_echo_solve(uuid,uuid,text),public.invisible_event_snapshot(uuid,uuid,text),public.invisible_event_contribute(uuid,uuid,text,text),public.invisible_event_solve(uuid,uuid,text,text) to service_role;
comment on table public.invisible_events is 'Authored UTC calendar. Completion requires eight real affinities and a verified correct answer; no automatic or simulated attendance.';
comment on table public.invisible_event_solutions is 'Personal durable seasonal finale. No economic reward, no dialogue, no identity exposed in snapshots.';
commit;
