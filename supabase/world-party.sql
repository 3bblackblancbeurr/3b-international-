-- Private, persistent exploration parties. Economic mutations are atomic and
-- never trust balances, player IDs, avatars or camp ranks supplied by clients.
create table public.world_parties (
 id uuid primary key default gen_random_uuid(),
 code text not null unique default upper(substr(replace(gen_random_uuid()::text,'-',''),1,12)),
 host uuid references auth.users(id) on delete set null,
 camps jsonb not null default '{}'::jsonb,
 created_at timestamptz not null default now()
);
create table public.world_party_members (
 user_id uuid primary key references auth.users(id) on delete cascade,
 party_id uuid not null references public.world_parties(id) on delete cascade,
 joined_at timestamptz not null default now()
);
create index world_party_members_party_idx on public.world_party_members(party_id);
create table public.world_party_receipts (
 user_id uuid not null references auth.users(id) on delete cascade,
 request_id uuid not null,
 party_id uuid not null references public.world_parties(id) on delete cascade,
 created_at timestamptz not null default now(),
 primary key(user_id,request_id)
);
alter table public.world_parties enable row level security;
alter table public.world_party_members enable row level security;
alter table public.world_party_receipts enable row level security;
revoke all on public.world_parties,public.world_party_members,public.world_party_receipts from public,anon,authenticated;
grant all on public.world_parties,public.world_party_members,public.world_party_receipts to service_role;
grant select on public.world_party_members to authenticated;
create policy world_member_self on public.world_party_members for select to authenticated using(user_id=(select auth.uid()));

-- A separate topic per sender prevents one member from impersonating another.
create policy world_party_receive on realtime.messages for select to authenticated
using(extension='broadcast' and split_part((select realtime.topic()),':',1)='worldparty'
 and exists(select 1 from public.world_party_members m where m.user_id=(select auth.uid()) and m.party_id::text=split_part((select realtime.topic()),':',2)));
create policy world_party_send on realtime.messages for insert to authenticated
with check(extension='broadcast' and split_part((select realtime.topic()),':',1)='worldparty'
 and split_part((select realtime.topic()),':',3)=(select auth.uid())::text
 and exists(select 1 from public.world_party_members m where m.user_id=(select auth.uid()) and m.party_id::text=split_part((select realtime.topic()),':',2)));

create function public.world_party_command(p_action text,p_payload jsonb default '{}'::jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
 uid uuid:=auth.uid(); sid uuid; pid uuid; party public.world_parties%rowtype;
 player public.member_world_state%rowtype; h jsonb; camp jsonb; next_camps jsonb;
 region text; req uuid; rank integer; wood integer; stone integer; count_members integer;
begin
 if uid is null then raise exception 'Connecte-toi à ton compte 3B.' using errcode='28000'; end if;
 begin sid:=(auth.jwt()->>'session_id')::uuid; exception when others then sid:=null; end;
 if sid is null or not public.loyalty_session_valid(uid,sid) then raise exception 'Ta session a expiré.' using errcode='28000'; end if;
 if p_action not in ('status','create','join','leave','contribute') or pg_column_size(p_payload)>2048 then raise exception 'Demande invalide.'; end if;
 if not public.loyalty_rate(uid::text||':world-party',80,60) then raise exception 'Patiente avant de réessayer.'; end if;
 -- Serialise this user's membership changes, then lock the shared party before
 -- counting members or spending anything. All callers take locks in this order.
 perform pg_advisory_xact_lock(hashtextextended('world-party-user:'||uid::text,0));
 select party_id into pid from public.world_party_members where user_id=uid;
 if p_action='create' then
  if pid is not null then raise exception 'Quitte ton groupe actuel avant d’en créer un autre.'; end if;
  if not public.loyalty_rate(uid::text||':world-party-create',5,3600) then raise exception 'Trop de groupes créés. Rejoins un groupe existant.'; end if;
  insert into public.world_parties(host) values(uid) returning id into pid;
  insert into public.world_party_members(user_id,party_id) values(uid,pid);
 elsif p_action='join' then
  if pid is not null then raise exception 'Tu fais déjà partie d’un groupe.'; end if;
  if not public.loyalty_rate(uid::text||':world-party-join',12,60) then raise exception 'Patiente avant de saisir un autre code.'; end if;
  select id into pid from public.world_parties where code=upper(trim(p_payload->>'code')) for update;
  if pid is null then raise exception 'Ce code de groupe est introuvable.'; end if;
  select count(*) into count_members from public.world_party_members where party_id=pid;
  if count_members>=4 then raise exception 'Ce groupe accueille déjà quatre voyageurs.'; end if;
  insert into public.world_party_members(user_id,party_id) values(uid,pid);
 elsif p_action='leave' then
  if pid is not null then
   perform 1 from public.world_parties where id=pid for update;
   delete from public.world_party_members where user_id=uid;
   update public.world_parties set host=(select user_id from public.world_party_members where party_id=pid order by joined_at limit 1) where id=pid and host=uid;
  end if;
  return jsonb_build_object('party',null,'members','[]'::jsonb);
 end if;
 if pid is null then return jsonb_build_object('party',null,'members','[]'::jsonb); end if;
 select * into party from public.world_parties where id=pid for update;
 if p_action='contribute' then
  begin req:=(p_payload->>'request')::uuid; exception when others then req:=null; end;
  if req is null then raise exception 'Requête de construction invalide.'; end if;
  if not exists(select 1 from public.world_party_receipts where user_id=uid and request_id=req) then
   select * into player from public.member_world_state where user_id=uid for update;
   if player.user_id is null then raise exception 'Ouvre ta sauvegarde du monde avant de construire.'; end if;
   region:=player.data->>'region';
   if region not in ('france','italie','estonie','turquie','algerie','tunisie','maroc','espagne') then raise exception 'Traverse une porte pour construire dans ce pays.'; end if;
   if player.data#>>'{adventure,encounter,card}' is not null and player.data#>>'{adventure,encounter,result}' is null then raise exception 'Termine ta rencontre avant de construire.'; end if;
   h:=coalesce(player.data#>array['adventure','frontier',region],'{}'::jsonb);
   wood:=coalesce((h->>'wood')::integer,0);stone:=coalesce((h->>'stone')::integer,0);
   if wood<2 or stone<1 then raise exception 'Il faut 2 bois et 1 pierre récoltés dans ce pays.'; end if;
   camp:=coalesce(party.camps->region,'{"rank":0,"wood":0,"stone":0}'::jsonb);
   rank:=(camp->>'rank')::integer;
   if rank>=8 then raise exception 'Le refuge commun est au rang maximal.'; end if;
   camp:=camp||jsonb_build_object('wood',(camp->>'wood')::integer+2,'stone',(camp->>'stone')::integer+1);
   if (camp->>'wood')::integer>=6*(rank+1) and (camp->>'stone')::integer>=3*(rank+1) then
    camp:=jsonb_build_object('rank',rank+1,'wood',(camp->>'wood')::integer-6*(rank+1),'stone',(camp->>'stone')::integer-3*(rank+1));
   end if;
   next_camps:=jsonb_set(party.camps,array[region],camp,true);
   update public.member_world_state set data=jsonb_set(player.data,array['adventure','frontier',region],h||jsonb_build_object('wood',wood-2,'stone',stone-1),true),revision=revision+1,updated_at=now() where user_id=uid;
   update public.world_parties set camps=next_camps where id=pid;
   insert into public.world_party_receipts(user_id,request_id,party_id) values(uid,req,pid);
   party.camps:=next_camps;
  end if;
 end if;
 return jsonb_build_object('party',jsonb_build_object('id',party.id,'code',party.code,'host',party.host,'camps',party.camps),
 'members',coalesce((select jsonb_agg(jsonb_build_object('id',m.user_id,'avatar',coalesce(w.data#>'{adventure,avatar}','{}'::jsonb),'region',coalesce(w.data->>'region','hub')) order by m.joined_at)
 from public.world_party_members m left join public.member_world_state w on w.user_id=m.user_id where m.party_id=pid),'[]'::jsonb));
end $$;
revoke all on function public.world_party_command(text,jsonb) from public,anon;
grant execute on function public.world_party_command(text,jsonb) to authenticated;
