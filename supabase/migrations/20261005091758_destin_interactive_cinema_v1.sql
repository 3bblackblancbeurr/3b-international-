create table public.destin_stories (
 id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade,
 draft jsonb not null, revision integer not null default 1, published_release uuid,
 status text not null default 'draft' check(status in ('draft','published','archived')),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 check(jsonb_typeof(draft)='object' and octet_length(draft::text)<=524288)
);
create index destin_stories_owner_idx on public.destin_stories(owner_id);
create table public.destin_releases (
 id uuid primary key default gen_random_uuid(), story_id uuid not null references public.destin_stories(id) on delete cascade,
 version integer not null, manifest jsonb not null, created_at timestamptz not null default now(), unique(story_id,version)
);
alter table public.destin_stories add constraint destin_stories_release_fk foreign key(published_release) references public.destin_releases(id) on delete set null;
create index destin_stories_release_idx on public.destin_stories(published_release);
create table public.destin_runs (
 id uuid primary key, user_id uuid not null references auth.users(id) on delete cascade,
 release_id uuid not null references public.destin_releases(id) on delete cascade,
 node_id text not null, path jsonb not null default '[]', position double precision not null default 0,
 state text not null default 'playing' check(state in ('playing','complete','abandoned')),
 node_started_at timestamptz not null default clock_timestamp(), created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(), completed_at timestamptz
);
create index destin_runs_user_idx on public.destin_runs(user_id,updated_at desc);
create index destin_runs_release_idx on public.destin_runs(release_id);
create unique index destin_one_active_run on public.destin_runs(user_id,release_id) where state='playing';
create table public.destin_decisions (
 release_id uuid not null references public.destin_releases(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade, node_id text not null, choice_id text not null,
 created_at timestamptz not null default now(), primary key(release_id,user_id,node_id)
);
create index destin_decisions_user_idx on public.destin_decisions(user_id);
create index destin_decisions_stats_idx on public.destin_decisions(release_id,node_id,choice_id);
create table public.destin_unlocks (
 user_id uuid not null references auth.users(id) on delete cascade,
 story_id uuid not null references public.destin_stories(id) on delete cascade,
 ending_id text not null, title text not null, fragment text not null default '', rarity text not null default 'standard',
 run_id uuid not null references public.destin_runs(id) on delete cascade,
 reward_status text not null default 'none' check(reward_status in ('none','pending','awarded')),
 reward jsonb, last_attempt timestamptz, created_at timestamptz not null default now(),
 primary key(user_id,story_id,ending_id)
);
create index destin_unlocks_story_idx on public.destin_unlocks(story_id);
create index destin_unlocks_run_idx on public.destin_unlocks(run_id);
create table public.destin_polls (
 id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade,
 question text not null check(length(question) between 1 and 240), options jsonb not null,
 closes_at timestamptz not null, cancelled boolean not null default false, created_at timestamptz not null default now(),
 check(jsonb_typeof(options)='array' and jsonb_array_length(options) between 2 and 4)
);
create index destin_polls_owner_idx on public.destin_polls(owner_id);
create table public.destin_votes (
 poll_id uuid not null references public.destin_polls(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade, choice_id text not null,
 created_at timestamptz not null default now(), primary key(poll_id,user_id)
);
create index destin_votes_user_idx on public.destin_votes(user_id);
do $$ declare t text; begin
 foreach t in array array['destin_stories','destin_releases','destin_runs','destin_decisions','destin_unlocks','destin_polls','destin_votes'] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('revoke all on public.%I from public, anon, authenticated',t);
  execute format('grant select, insert, update, delete on public.%I to service_role',t);
  execute format('create policy %I on public.%I for all to service_role using (true) with check (true)',t||'_server_only',t);
 end loop;
end $$;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('destin-media','destin-media',false,52428800,array['video/mp4','video/webm','image/jpeg','image/png','image/webp','text/vtt']) on conflict(id) do nothing;
insert into public.reward_definitions(code,label,xp,coins,active,repeatable)
values('destin_ending','3B DESTIN · fin découverte',25,2,true,true) on conflict(code) do nothing;
insert into public.threeb_reward_policy(reward_code,max_events_per_day,daily_xp_cap,daily_coins_cap,cooldown_seconds,diminishing,min_global_level,sensitive,active)
values('destin_ending',3,75,6,30,'[1]',1,false,true) on conflict(reward_code) do nothing;

create function public.destin_poll_snapshot_server(p_user uuid) returns jsonb language sql stable security invoker set search_path='' as $$
 select coalesce(jsonb_agg(x.payload order by x.created_at desc),'[]'::jsonb) from (
  select p.created_at,jsonb_build_object('id',p.id,'question',p.question,'closesAt',p.closes_at,'closed',p.closes_at<=now(),'serverNow',now(),
   'myChoice',(select v.choice_id from public.destin_votes v where v.poll_id=p.id and v.user_id=p_user),
   'options',(select jsonb_agg(o||jsonb_build_object('count',(select count(*) from public.destin_votes v where v.poll_id=p.id and v.choice_id=o->>'id'))) from jsonb_array_elements(p.options) o)) payload
  from public.destin_polls p where not p.cancelled order by p.created_at desc limit 20
 ) x
$$;
create function public.destin_snapshot_server(p_user uuid,p_run uuid) returns jsonb language plpgsql security invoker set search_path='' as $$
#variable_conflict use_column
declare r public.destin_runs%rowtype; m jsonb; sid uuid; u jsonb; stats jsonb; lev integer;
begin
 select * into r from public.destin_runs where id=p_run and user_id=p_user;
 if not found then raise exception 'Parcours introuvable.'; end if;
 select manifest,story_id into m,sid from public.destin_releases where id=r.release_id;
 select public.threeb_level_from_xp(coalesce(xp,0)) into lev from public.member_profiles where user_id=p_user;
 select coalesce(jsonb_agg(ending_id),'[]') into u from public.destin_unlocks where user_id=p_user and story_id=sid;
 select coalesce(jsonb_agg(jsonb_build_object('choice',choice_id,'count',n)),'[]') into stats from (
  select choice_id,count(*) n from public.destin_decisions where release_id=r.release_id and node_id=(r.path->-1->>'node') group by choice_id
 ) c;
 return jsonb_build_object('run',to_jsonb(r)-'user_id','storyId',sid,'manifest',m,'level',coalesce(lev,1),'unlocked',u,'choiceStats',stats,
  'endingReward',(select jsonb_build_object('status',reward_status,'reward',reward,'endingId',ending_id) from public.destin_unlocks where user_id=p_user and story_id=sid and run_id=r.id limit 1));
end $$;
create function public.destin_claim_server(p_user uuid,p_story uuid,p_ending text) returns jsonb language plpgsql security invoker set search_path='' as $$
#variable_conflict use_column
declare u public.destin_unlocks%rowtype; result jsonb;
begin
 select * into u from public.destin_unlocks where user_id=p_user and story_id=p_story and ending_id=p_ending for update;
 if not found then raise exception 'Cette fin n’est pas encore débloquée.'; end if;
 if u.reward_status<>'pending' or u.last_attempt>clock_timestamp()-interval '30 seconds' then return jsonb_build_object('status',u.reward_status,'reward',u.reward); end if;
 begin
  result:=public.threeb_credit_reward_server(p_user,'destin_ending','destin:'||p_story::text||':'||p_ending);
  update public.destin_unlocks set reward_status='awarded',reward=result,last_attempt=clock_timestamp() where user_id=p_user and story_id=p_story and ending_id=p_ending;
  return jsonb_build_object('status','awarded','reward',result);
 exception when others then
  update public.destin_unlocks set last_attempt=clock_timestamp() where user_id=p_user and story_id=p_story and ending_id=p_ending;
  return jsonb_build_object('status','pending','message','Récompense conservée. Réessaie plus tard depuis Mes destins.');
 end;
end $$;
create function public.destin_command_server(p_user uuid,p_action text,p_body jsonb default '{}',p_owner boolean default false) returns jsonb
language plpgsql security invoker set search_path='' as $$
#variable_conflict use_column
declare s public.destin_stories%rowtype; r public.destin_runs%rowtype; rel public.destin_releases%rowtype;
 poll public.destin_polls%rowtype; node jsonb; choice jsonb; target jsonb; ending jsonb; result jsonb;
 rid uuid; sid uuid; nonce text; lev integer; pos double precision; cutoff double precision; n integer;
begin
 if p_user is null then raise exception 'Connexion requise.'; end if;
 if not exists(select 1 from public.member_profiles where user_id=p_user and passport_state='active') then raise exception 'Un Passeport 3B actif est requis.'; end if;
 if jsonb_typeof(p_body)<>'object' or octet_length(p_body::text)>524288 then raise exception 'Requête invalide.'; end if;
 if p_action in ('editor','save','publish','archive','poll-create','poll-cancel') and not p_owner then raise exception 'Studio réservé au propriétaire 3B.'; end if;
 if p_action='catalog' then
  select coalesce(jsonb_agg(x.item order by x.created_at desc),'[]') into result from (
   select r.created_at,jsonb_build_object('id',s.id,'releaseId',r.id,'title',r.manifest->>'title','synopsis',r.manifest->>'synopsis','cover',r.manifest->>'cover',
    'scenes',jsonb_array_length(r.manifest->'nodes'),'endings',(select count(*) from jsonb_array_elements(r.manifest->'nodes') n where n->'ending' is not null and n->'ending'<>'null'::jsonb),
    'resume',(select id from public.destin_runs where user_id=p_user and release_id=r.id and state='playing' limit 1)) item
   from public.destin_stories s join public.destin_releases r on r.id=s.published_release where s.status='published' order by r.created_at desc limit 60
  ) x;
  return jsonb_build_object('stories',result,'polls',public.destin_poll_snapshot_server(p_user));
 elsif p_action='editor' then
  select coalesce(jsonb_agg(to_jsonb(s) order by updated_at desc),'[]') into result from public.destin_stories s where owner_id=p_user;
  return jsonb_build_object('stories',result);
 elsif p_action='save' then
  if jsonb_typeof(p_body->'manifest')<>'object' then raise exception 'Projet invalide.'; end if;
  if coalesce(p_body->>'id','')='' then
   insert into public.destin_stories(owner_id,draft) values(p_user,p_body->'manifest') returning * into s;
  else
   select * into s from public.destin_stories where id=(p_body->>'id')::uuid and owner_id=p_user for update;
   if not found then raise exception 'Projet introuvable.'; end if;
   if s.revision<>(p_body->>'revision')::integer then raise exception 'Ce projet a changé dans un autre onglet. Recharge-le avant de remplacer cette version.'; end if;
   update public.destin_stories set draft=p_body->'manifest',revision=revision+1,updated_at=now() where id=s.id returning * into s;
  end if;
  return jsonb_build_object('story',to_jsonb(s));
 elsif p_action in ('publish','archive') then
  select * into s from public.destin_stories where id=(p_body->>'id')::uuid and owner_id=p_user for update;
  if not found then raise exception 'Projet introuvable.'; end if;
  if s.revision<>(p_body->>'revision')::integer then raise exception 'Le projet a changé. Enregistre puis relance la publication.'; end if;
  if p_action='archive' then update public.destin_stories set status='archived',updated_at=now() where id=s.id; return jsonb_build_object('ok',true); end if;
  if s.draft<>p_body->'manifest' then raise exception 'La validation ne correspond plus au brouillon.'; end if;
  select coalesce(max(version),0)+1 into n from public.destin_releases where story_id=s.id;
  insert into public.destin_releases(story_id,version,manifest) values(s.id,n,s.draft) returning * into rel;
  update public.destin_stories set status='published',published_release=rel.id,updated_at=now() where id=s.id;
  return jsonb_build_object('ok',true,'releaseId',rel.id,'version',n);
 elsif p_action='history' then
  return jsonb_build_object('runs',(select coalesce(jsonb_agg(x.item order by x.updated_at desc),'[]') from (
   select r.updated_at,jsonb_build_object('id',r.id,'storyId',rel.story_id,'title',rel.manifest->>'title','state',r.state,'path',r.path,'updatedAt',r.updated_at) item
   from public.destin_runs r join public.destin_releases rel on rel.id=r.release_id where r.user_id=p_user order by r.updated_at desc limit 100) x),
   'unlocks',(select coalesce(jsonb_agg(to_jsonb(u)-'user_id' order by created_at desc),'[]') from public.destin_unlocks u where user_id=p_user));
 elsif p_action='claim' then
  return public.destin_claim_server(p_user,(p_body->>'storyId')::uuid,p_body->>'endingId');
 elsif p_action='poll-create' then
  if length(p_body->>'question') not between 1 and 240 or jsonb_array_length(p_body->'options') not between 2 and 4 then raise exception 'Vote invalide.'; end if;
  if (p_body->>'closesAt')::timestamptz<=now() or (p_body->>'closesAt')::timestamptz>now()+interval '30 days' then raise exception 'Choisis une clôture dans les 30 prochains jours.'; end if;
  insert into public.destin_polls(owner_id,question,options,closes_at) values(p_user,p_body->>'question',p_body->'options',(p_body->>'closesAt')::timestamptz);
  return jsonb_build_object('polls',public.destin_poll_snapshot_server(p_user));
 elsif p_action in ('vote','poll-cancel') then
  select * into poll from public.destin_polls where id=(p_body->>'pollId')::uuid for update;
  if not found or poll.cancelled then raise exception 'Vote indisponible.'; end if;
  if p_action='poll-cancel' then
   if poll.owner_id<>p_user then raise exception 'Action non autorisée.'; end if;
   update public.destin_polls set cancelled=true where id=poll.id;
  else
   if exists(select 1 from public.destin_votes where poll_id=poll.id and user_id=p_user) then return jsonb_build_object('polls',public.destin_poll_snapshot_server(p_user)); end if;
   if poll.closes_at<=clock_timestamp() then raise exception 'Ce vote est terminé.'; end if;
   if not exists(select 1 from jsonb_array_elements(poll.options) o where o->>'id'=p_body->>'choiceId') then raise exception 'Réponse non autorisée.'; end if;
   insert into public.destin_votes(poll_id,user_id,choice_id) values(poll.id,p_user,p_body->>'choiceId') on conflict do nothing;
  end if;
  return jsonb_build_object('polls',public.destin_poll_snapshot_server(p_user));
 elsif p_action='start' then
  perform pg_advisory_xact_lock(hashtextextended(p_user::text,31));
  rid:=(p_body->>'requestId')::uuid;
  if exists(select 1 from public.destin_runs where id=rid and user_id=p_user) then return public.destin_snapshot_server(p_user,rid); end if;
  select * into s from public.destin_stories where id=(p_body->>'storyId')::uuid and status='published';
  if not found then raise exception 'Ce film n’est pas disponible.'; end if;
  select * into rel from public.destin_releases where id=s.published_release;
  if not coalesce((p_body->>'restart')::boolean,false) then
   select id into rid from public.destin_runs where user_id=p_user and release_id=rel.id and state='playing' limit 1;
   if found then return public.destin_snapshot_server(p_user,rid); end if;
  end if;
  if (select count(*) from public.destin_runs where user_id=p_user and created_at>now()-interval '1 day')>=30 then raise exception 'Limite de nouveaux parcours atteinte pour aujourd’hui.'; end if;
  update public.destin_runs set state='abandoned',updated_at=now() where user_id=p_user and release_id=rel.id and state='playing';
  select value into node from jsonb_array_elements(rel.manifest->'nodes') where value->>'id'=rel.manifest->>'entry';
  if node is null then raise exception 'Scène de départ indisponible.'; end if;
  rid:=(p_body->>'requestId')::uuid;
  insert into public.destin_runs(id,user_id,release_id,node_id,position) values(rid,p_user,rel.id,node->>'id',(node->>'start')::double precision);
  return public.destin_snapshot_server(p_user,rid);
 elsif p_action in ('resume','checkpoint','choose','finish') then
  rid:=(p_body->>'runId')::uuid;
  select * into r from public.destin_runs where id=rid and user_id=p_user for update;
  if not found then raise exception 'Parcours introuvable.'; end if;
  select * into rel from public.destin_releases where id=r.release_id;
  select * into s from public.destin_stories where id=rel.story_id;
  if s.status<>'published' then raise exception 'Ce film a été retiré du catalogue.'; end if;
  if p_action='resume' then return public.destin_snapshot_server(p_user,r.id); end if;
  nonce:=p_body->>'requestId';
  if p_action in ('choose','finish') and nonce is not null and exists(select 1 from jsonb_array_elements(r.path) e where e->>'requestId'=nonce) then return public.destin_snapshot_server(p_user,r.id); end if;
  if r.state='complete' and p_action='finish' then return public.destin_snapshot_server(p_user,r.id); end if;
  if r.state<>'playing' then raise exception 'Ce parcours n’est plus actif.'; end if;
  if r.node_id<>p_body->>'nodeId' or jsonb_array_length(r.path)<>(p_body->>'step')::integer then raise exception 'Le parcours a avancé dans un autre onglet. Reprends la version sauvegardée.'; end if;
  select value into node from jsonb_array_elements(rel.manifest->'nodes') where value->>'id'=r.node_id;
  if node is null then raise exception 'Scène introuvable.'; end if;
  if p_action='checkpoint' then
   pos:=(p_body->>'position')::double precision;
   if pos='NaN'::double precision or pos='Infinity'::double precision or pos='-Infinity'::double precision then raise exception 'Position invalide.'; end if;
   update public.destin_runs set position=greatest((node->>'start')::double precision,least((node->>'end')::double precision,pos)),updated_at=now() where id=r.id;
   return jsonb_build_object('saved',true);
  end if;
  if nonce is null or nonce !~ '^[0-9a-f-]{36}$' then raise exception 'Identifiant de décision invalide.'; end if;
  cutoff:=greatest(0,(node->>'end')::double precision-(node->>'start')::double precision-1);
  if extract(epoch from clock_timestamp()-r.node_started_at)<cutoff then raise exception 'La scène doit se terminer avant de valider cette décision.'; end if;
  if p_action='choose' then
   select value into choice from jsonb_array_elements(node->'choices') where value->>'id'=p_body->>'choiceId';
   if choice is null then raise exception 'Réponse non autorisée.'; end if;
   select public.threeb_level_from_xp(coalesce(xp,0)) into lev from public.member_profiles where user_id=p_user;
   if coalesce(lev,1)<coalesce((choice->>'minLevel')::integer,1) then raise exception 'Niveau requis non atteint.'; end if;
   if coalesce(choice->>'requiresEnding','')<>'' and not exists(select 1 from public.destin_unlocks where user_id=p_user and story_id=s.id and ending_id=choice->>'requiresEnding') then raise exception 'Découvre d’abord la fin requise.'; end if;
   select value into target from jsonb_array_elements(rel.manifest->'nodes') where value->>'id'=choice->>'target';
   if target is null then raise exception 'La scène suivante n’existe pas.'; end if;
   if jsonb_array_length(r.path)>=128 then raise exception 'Parcours trop long.'; end if;
   insert into public.destin_decisions(release_id,user_id,node_id,choice_id) values(rel.id,p_user,r.node_id,choice->>'id') on conflict do nothing;
   update public.destin_runs set node_id=target->>'id',position=(target->>'start')::double precision,node_started_at=clock_timestamp(),updated_at=now(),
    path=path||jsonb_build_array(jsonb_build_object('node',r.node_id,'choice',choice->>'id','label',choice->>'label','target',target->>'id','requestId',nonce,'at',now())) where id=r.id;
  else
   ending:=node->'ending';
   if ending is null or ending='null'::jsonb or jsonb_array_length(node->'choices')<>0 then raise exception 'Cette scène n’est pas une fin.'; end if;
   update public.destin_runs set state='complete',completed_at=now(),updated_at=now(),position=(node->>'end')::double precision where id=r.id;
   insert into public.destin_unlocks(user_id,story_id,ending_id,title,fragment,rarity,run_id,reward_status)
    values(p_user,s.id,ending->>'id',ending->>'title',coalesce(ending->>'fragment',''),ending->>'rarity',r.id,case when (ending->>'reward')::boolean then 'pending' else 'none' end)
    on conflict(user_id,story_id,ending_id) do nothing;
   perform public.destin_claim_server(p_user,s.id,ending->>'id');
  end if;
  return public.destin_snapshot_server(p_user,r.id);
 end if;
 raise exception 'Action 3B DESTIN inconnue.';
end $$;
revoke all on function public.destin_poll_snapshot_server(uuid) from public,anon,authenticated;
revoke all on function public.destin_snapshot_server(uuid,uuid) from public,anon,authenticated;
revoke all on function public.destin_claim_server(uuid,uuid,text) from public,anon,authenticated;
revoke all on function public.destin_command_server(uuid,text,jsonb,boolean) from public,anon,authenticated;
grant execute on function public.destin_poll_snapshot_server(uuid),public.destin_snapshot_server(uuid,uuid),public.destin_claim_server(uuid,uuid,text),public.destin_command_server(uuid,text,jsonb,boolean) to service_role;
