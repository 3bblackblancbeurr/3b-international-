-- Eight affinities, not a claim about the player's residence or physical position.
begin;
create table public.invisible_echo_contributions (
 user_id uuid primary key references auth.users(id) on delete cascade,
 realm text not null check(realm in ('france','algerie','maroc','tunisie','espagne','italie','turquie','estonie')),
 mission text not null default 'eight-echoes-001' check(mission='eight-echoes-001'),
 created_at timestamptz not null default now()
);
alter table public.invisible_echo_contributions enable row level security;
revoke all on public.invisible_echo_contributions from public,anon,authenticated;
grant select,insert on public.invisible_echo_contributions to service_role;

create function public.invisible_echo_snapshot(p_user uuid,p_session uuid) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare own_realm text; echoes jsonb; covered integer; eligible boolean;
begin
 if not coalesce(public.loyalty_session_valid(p_user,p_session),false) then raise exception 'session_expired' using errcode='28000'; end if;
 select realm into own_realm from public.invisible_echo_contributions where user_id=p_user;
 select jsonb_agg(jsonb_build_object('realm',r.realm,'contributors',coalesce(c.n,0)) order by r.position),count(*) filter(where coalesce(c.n,0)>0)
 into echoes,covered from (values ('france',1),('algerie',2),('maroc',3),('tunisie',4),('espagne',5),('italie',6),('turquie',7),('estonie',8)) r(realm,position)
 left join (select realm,count(*) n from public.invisible_echo_contributions group by realm)c on c.realm=r.realm;
 select exists(select 1 from public.member_world_state w join public.member_profiles p using(user_id)
  where w.user_id=p_user and p.passport_state='active' and w.data#>>'{invisible,started}'='true'
  and w.data#>'{invisible,solved}'='["rive","balance","preuve"]'::jsonb and w.data#>>'{invisible,chestOpened}'='true') into eligible;
 return jsonb_build_object('mission','eight-echoes-001','realms',echoes,'covered',covered,'required',8,'awakened',covered=8,
  'contributedRealm',own_realm,'eligible',eligible,'contributors',(select count(*) from public.invisible_echo_contributions));
end;$$;

create function public.invisible_echo_contribute(p_user uuid,p_session uuid,p_realm text default null) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare player jsonb; country text; passport_state text; selected text; previous text;
begin
 if not coalesce(public.loyalty_session_valid(p_user,p_session),false) then raise exception 'session_expired' using errcode='28000'; end if;
 -- Lock account state before evaluating eligibility; clients cannot submit chest flags here.
 select data into player from public.member_world_state where user_id=p_user for update;
 if not found or player#>>'{invisible,started}' is distinct from 'true'
  or player#>'{invisible,solved}' is distinct from '["rive","balance","preuve"]'::jsonb
  or player#>>'{invisible,chestOpened}' is distinct from 'true' then raise exception 'fragment_required' using errcode='P0001'; end if;
 select p.country,p.passport_state into country,passport_state from public.member_profiles p where p.user_id=p_user;
 if passport_state is distinct from 'active' then raise exception 'passport_required' using errcode='P0001'; end if;
 selected:=coalesce(p_realm,case country when 'France' then 'france' when 'Algérie' then 'algerie' when 'Maroc' then 'maroc' when 'Tunisie' then 'tunisie' when 'Espagne' then 'espagne' when 'Italie' then 'italie' when 'Turquie' then 'turquie' when 'Estonie' then 'estonie' end);
 if selected is null or selected not in ('france','algerie','maroc','tunisie','espagne','italie','turquie','estonie') then raise exception 'invalid_realm' using errcode='P0001'; end if;
 select realm into previous from public.invisible_echo_contributions where user_id=p_user;
 if previous is not null and previous<>selected then raise exception 'realm_locked' using errcode='P0001'; end if;
 insert into public.invisible_echo_contributions(user_id,realm) values(p_user,selected) on conflict(user_id) do nothing;
 return public.invisible_echo_snapshot(p_user,p_session);
end;$$;
revoke all on function public.invisible_echo_snapshot(uuid,uuid),public.invisible_echo_contribute(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.invisible_echo_snapshot(uuid,uuid),public.invisible_echo_contribute(uuid,uuid,text) to service_role;
comment on table public.invisible_echo_contributions is 'One echo per account for the entire mission. Chosen heritage affinity, no physical position or dialogue.';
commit;
