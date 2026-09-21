create table public.world_party_runtime (
  user_id uuid primary key references auth.users(id) on delete cascade,
  party_id uuid not null references public.world_parties(id) on delete cascade,
  region text not null,
  x double precision not null,
  z double precision not null,
  heading double precision not null default 0,
  life_state text not null default 'active' check (life_state in ('active','downed')),
  downed_at timestamptz,
  revived_at timestamptz,
  revision bigint not null default 1 check (revision > 0),
  updated_at timestamptz not null default now(),
  check (region in ('hub','france','italie','estonie','turquie','algerie','tunisie','maroc','espagne'))
);

create index world_party_runtime_party_updated_idx
  on public.world_party_runtime(party_id,updated_at desc);

create table public.world_party_runtime_receipts (
  actor_user_id uuid not null references auth.users(id) on delete cascade,
  request_id uuid not null,
  party_id uuid not null references public.world_parties(id) on delete cascade,
  action text not null check (action in ('revive')),
  target_user_id uuid references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(actor_user_id,request_id)
);

create index world_party_runtime_receipts_party_idx
  on public.world_party_runtime_receipts(party_id,created_at desc);

create table public.world_party_objectives (
  party_id uuid not null references public.world_parties(id) on delete cascade,
  objective_id text not null,
  request_id uuid not null,
  completed_by uuid not null references auth.users(id) on delete cascade,
  region text not null,
  required_members integer not null check (required_members between 2 and 4),
  participant_ids uuid[] not null default '{}',
  completed_at timestamptz not null default now(),
  primary key(party_id,objective_id),
  unique(completed_by,request_id),
  check (objective_id ~ '^[a-z0-9:_-]{3,64}$'),
  check (region in ('hub','france','italie','estonie','turquie','algerie','tunisie','maroc','espagne'))
);

alter table public.world_party_runtime enable row level security;
alter table public.world_party_runtime_receipts enable row level security;
alter table public.world_party_objectives enable row level security;

revoke all on public.world_party_runtime,public.world_party_runtime_receipts,public.world_party_objectives from public,anon,authenticated;
grant all on public.world_party_runtime,public.world_party_runtime_receipts,public.world_party_objectives to service_role;

create function public.world_party_runtime_cleanup()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
begin
  delete from public.world_party_runtime where user_id=old.user_id;
  return old;
end
$$;

revoke all on function public.world_party_runtime_cleanup() from public,anon,authenticated;

create trigger world_party_runtime_cleanup_after_membership
after delete on public.world_party_members
for each row execute function public.world_party_runtime_cleanup();

create function public.world_party_runtime_command(p_action text,p_payload jsonb default '{}'::jsonb)
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  uid uuid:=auth.uid();
  sid uuid;
  pid uuid;
  req uuid;
  target uuid;
  v_region text;
  v_objective text;
  v_x double precision;
  v_z double precision;
  v_heading double precision;
  v_radius double precision;
  v_elapsed double precision;
  v_distance double precision;
  v_required integer;
  v_count integer;
  v_participants uuid[];
  v_members jsonb;
  v_prev public.world_party_runtime%rowtype;
  v_actor public.world_party_runtime%rowtype;
  v_target public.world_party_runtime%rowtype;
  v_existing public.world_party_objectives%rowtype;
begin
  if uid is null then
    raise exception 'Connecte-toi à ton compte 3B.' using errcode='28000';
  end if;

  begin sid:=(auth.jwt()->>'session_id')::uuid; exception when others then sid:=null; end;
  if sid is null or not public.loyalty_session_valid(uid,sid) then
    raise exception 'Ta session a expiré.' using errcode='28000';
  end if;

  if p_action not in ('status','heartbeat','down','revive','objective')
     or p_payload is null
     or pg_column_size(p_payload)>2048 then
    raise exception 'Demande coop invalide.';
  end if;

  if not public.loyalty_rate(uid::text||':world-party-runtime',180,60) then
    raise exception 'Trop d’actions coop. Patiente avant de réessayer.';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('world-party-runtime:'||uid::text,0));

  select party_id into pid
  from public.world_party_members
  where user_id=uid;

  if pid is null then
    return jsonb_build_object('party_id',null,'members','[]'::jsonb);
  end if;

  if p_action='status' then
    select coalesce(jsonb_agg(jsonb_build_object(
      'id',r.user_id,
      'region',r.region,
      'x',r.x,
      'z',r.z,
      'heading',r.heading,
      'state',r.life_state,
      'revision',r.revision,
      'updated_at',r.updated_at
    ) order by r.updated_at desc),'[]'::jsonb)
    into v_members
    from public.world_party_runtime r
    join public.world_party_members m
      on m.user_id=r.user_id and m.party_id=r.party_id
    where r.party_id=pid
      and r.updated_at>now()-interval '20 seconds';

    return jsonb_build_object('party_id',pid,'members',v_members);
  end if;

  if p_action='heartbeat' then
    begin
      v_region:=p_payload->>'region';
      v_x:=(p_payload->>'x')::double precision;
      v_z:=(p_payload->>'z')::double precision;
      v_heading:=coalesce((p_payload->>'heading')::double precision,0);
    exception when others then
      raise exception 'Position coop invalide.';
    end;

    if v_region is null or v_x is null or v_z is null or v_heading is null then
      raise exception 'Position coop incomplète.';
    end if;

    if v_region not in ('hub','france','italie','estonie','turquie','algerie','tunisie','maroc','espagne') then
      raise exception 'Région coop invalide.';
    end if;

    v_radius:=case when v_region='hub' then 650 else 260 end;
    if sqrt(v_x*v_x+v_z*v_z)>v_radius+2 or abs(v_heading)>1080 then
      raise exception 'Position coop hors limites.';
    end if;

    select * into v_prev
    from public.world_party_runtime
    where user_id=uid
    for update;

    if found and v_prev.party_id=pid then
      v_elapsed:=greatest(0.001,extract(epoch from (now()-v_prev.updated_at)));
      if v_prev.region=v_region and v_elapsed<20 then
        v_distance:=sqrt(power(v_x-v_prev.x,2)+power(v_z-v_prev.z,2));
        if v_distance>greatest(8,v_elapsed*65+6) then
          raise exception 'Déplacement coop trop rapide.';
        end if;
      elsif v_prev.region<>v_region and v_elapsed<0.35 then
        raise exception 'Transition de région trop rapide.';
      end if;

      update public.world_party_runtime
      set party_id=pid,
          region=v_region,
          x=v_x,
          z=v_z,
          heading=v_heading,
          life_state=case
            when life_state='downed' and downed_at<now()-interval '45 seconds' then 'active'
            else life_state
          end,
          downed_at=case
            when life_state='downed' and downed_at<now()-interval '45 seconds' then null
            else downed_at
          end,
          revision=revision+1,
          updated_at=now()
      where user_id=uid;
    else
      insert into public.world_party_runtime(user_id,party_id,region,x,z,heading)
      values(uid,pid,v_region,v_x,v_z,v_heading)
      on conflict(user_id) do update
      set party_id=excluded.party_id,
          region=excluded.region,
          x=excluded.x,
          z=excluded.z,
          heading=excluded.heading,
          life_state='active',
          downed_at=null,
          revived_at=null,
          revision=public.world_party_runtime.revision+1,
          updated_at=now();
    end if;

    select coalesce(jsonb_agg(jsonb_build_object(
      'id',r.user_id,
      'region',r.region,
      'x',r.x,
      'z',r.z,
      'heading',r.heading,
      'state',r.life_state,
      'revision',r.revision,
      'updated_at',r.updated_at
    ) order by r.updated_at desc),'[]'::jsonb)
    into v_members
    from public.world_party_runtime r
    join public.world_party_members m
      on m.user_id=r.user_id and m.party_id=r.party_id
    where r.party_id=pid
      and r.updated_at>now()-interval '20 seconds';

    return jsonb_build_object('party_id',pid,'members',v_members);
  end if;

  if p_action='down' then
    select * into v_actor
    from public.world_party_runtime
    where user_id=uid and party_id=pid
    for update;

    if not found or v_actor.updated_at<=now()-interval '10 seconds' then
      raise exception 'Position coop expirée.';
    end if;

    if coalesce((select data#>>'{adventure,encounter,result}' from public.member_world_state where user_id=uid),'')<>'defeat' then
      raise exception 'La sauvegarde serveur ne confirme pas la mise à terre.';
    end if;

    if v_actor.life_state<>'downed' then
      update public.world_party_runtime
      set life_state='downed',downed_at=now(),revived_at=null,revision=revision+1,updated_at=now()
      where user_id=uid;
    end if;

    return jsonb_build_object('ok',true,'state','downed');
  end if;

  if p_action='revive' then
    begin
      req:=(p_payload->>'request')::uuid;
      target:=(p_payload->>'target')::uuid;
    exception when others then
      raise exception 'Réanimation invalide.';
    end;

    if req is null or target is null or target=uid then
      raise exception 'Réanimation invalide.';
    end if;

    if exists(
      select 1 from public.world_party_runtime_receipts
      where actor_user_id=uid and request_id=req and action='revive'
    ) then
      return jsonb_build_object('ok',true,'idempotent',true,'target',target);
    end if;

    if not exists(select 1 from public.world_party_members where user_id=target and party_id=pid) then
      raise exception 'Ce voyageur n’appartient pas à ton groupe.';
    end if;

    select * into v_actor from public.world_party_runtime
    where user_id=uid and party_id=pid for update;
    select * into v_target from public.world_party_runtime
    where user_id=target and party_id=pid for update;

    if v_actor.user_id is null or v_actor.life_state<>'active' or v_actor.updated_at<=now()-interval '7 seconds' then
      raise exception 'Ta position coop n’est pas assez récente.';
    end if;
    if v_target.user_id is null or v_target.life_state<>'downed' or v_target.updated_at<=now()-interval '20 seconds' then
      raise exception 'Ce voyageur n’est plus réanimable.';
    end if;
    if v_actor.region<>v_target.region then
      raise exception 'Rejoins ce voyageur dans le même pays.';
    end if;

    v_distance:=sqrt(power(v_actor.x-v_target.x,2)+power(v_actor.z-v_target.z,2));
    if v_distance>6 then
      raise exception 'Rapproche-toi du voyageur pour le réanimer.';
    end if;

    update public.world_party_runtime
    set life_state='active',revived_at=now(),downed_at=null,revision=revision+1,updated_at=now()
    where user_id=target;

    insert into public.world_party_runtime_receipts(actor_user_id,request_id,party_id,action,target_user_id)
    values(uid,req,pid,'revive',target);

    return jsonb_build_object('ok',true,'idempotent',false,'target',target);
  end if;

  if p_action='objective' then
    begin
      req:=(p_payload->>'request')::uuid;
      v_objective:=lower(trim(p_payload->>'objective'));
      v_region:=p_payload->>'region';
      v_x:=(p_payload->>'x')::double precision;
      v_z:=(p_payload->>'z')::double precision;
      v_required:=(p_payload->>'required')::integer;
    exception when others then
      raise exception 'Objectif coop invalide.';
    end;

    if req is null
       or v_objective is null
       or v_objective !~ '^[a-z0-9:_-]{3,64}$'
       or v_region not in ('hub','france','italie','estonie','turquie','algerie','tunisie','maroc','espagne')
       or v_required not between 2 and 4 then
      raise exception 'Objectif coop invalide.';
    end if;

    select * into v_existing
    from public.world_party_objectives
    where party_id=pid and objective_id=v_objective;

    if found then
      return jsonb_build_object(
        'ok',true,
        'idempotent',true,
        'objective',v_existing.objective_id,
        'participants',to_jsonb(v_existing.participant_ids)
      );
    end if;

    v_radius:=case when v_region='hub' then 650 else 260 end;
    if v_x is null or v_z is null or sqrt(v_x*v_x+v_z*v_z)>v_radius+2 then
      raise exception 'Position d’objectif invalide.';
    end if;

    select count(*),coalesce(array_agg(r.user_id order by r.user_id),'{}'::uuid[])
    into v_count,v_participants
    from public.world_party_runtime r
    join public.world_party_members m
      on m.user_id=r.user_id and m.party_id=r.party_id
    where r.party_id=pid
      and r.region=v_region
      and r.life_state='active'
      and r.updated_at>now()-interval '7 seconds'
      and sqrt(power(r.x-v_x,2)+power(r.z-v_z,2))<=6;

    if v_count<v_required or not (uid=any(v_participants)) then
      raise exception 'Le groupe n’est pas encore réuni sur cet objectif.';
    end if;

    insert into public.world_party_objectives(
      party_id,objective_id,request_id,completed_by,region,required_members,participant_ids
    ) values(pid,v_objective,req,uid,v_region,v_required,v_participants);

    return jsonb_build_object(
      'ok',true,
      'idempotent',false,
      'objective',v_objective,
      'participants',to_jsonb(v_participants)
    );
  end if;

  raise exception 'Action coop inconnue.';
end
$$;

revoke all on function public.world_party_runtime_command(text,jsonb) from public,anon,authenticated;
grant execute on function public.world_party_runtime_command(text,jsonb) to authenticated;
