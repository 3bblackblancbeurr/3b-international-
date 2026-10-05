-- Applied as 20261005103242. Existing runs are never discarded.
alter table public.destin_runs add column story_id uuid;
update public.destin_runs r set story_id=rel.story_id from public.destin_releases rel where rel.id=r.release_id;
alter table public.destin_runs alter column story_id set not null;
alter table public.destin_runs add constraint destin_runs_story_id_fkey foreign key(story_id) references public.destin_stories(id);
alter table public.destin_runs add constraint destin_runs_one_path_per_story unique(user_id,story_id);
do $patch$
declare source text; before_text text; after_text text;
begin
 select pg_get_functiondef('public.destin_command_server(uuid,text,jsonb,boolean)'::regprocedure) into source;
 before_text:=E'  if not coalesce((p_body->>\'restart\')::boolean,false) then\n   select id into rid from public.destin_runs where user_id=p_user and release_id=rel.id and state=\'playing\' limit 1;\n   if found then return public.destin_snapshot_server(p_user,rid); end if;\n  end if;';
 after_text:=E'  select id into rid from public.destin_runs where user_id=p_user and story_id=s.id;\n  if found then return public.destin_snapshot_server(p_user,rid); end if;\n  if coalesce((p_body->>\'restart\')::boolean,false) then raise exception \'Ce destin ne peut pas être recommencé.\'; end if;';
 if position(before_text in source)=0 then raise exception 'Unexpected start command version'; end if;
 source:=replace(source,before_text,after_text);
 before_text:='insert into public.destin_runs(id,user_id,release_id,node_id,position) values(rid,p_user,rel.id,node->>''id'',(node->>''start'')::double precision);';
 after_text:='insert into public.destin_runs(id,user_id,release_id,story_id,node_id,position) values(rid,p_user,rel.id,s.id,node->>''id'',(node->>''start'')::double precision);';
 if position(before_text in source)=0 then raise exception 'Unexpected run insert version'; end if;
 source:=replace(source,before_text,after_text);
 before_text:=E'   if choice is null then raise exception \'Réponse non autorisée.\'; end if;';
 after_text:=before_text||E'\n   if exists(select 1 from public.destin_decisions where release_id=rel.id and user_id=p_user and node_id=r.node_id and choice_id<>choice->>\'id\') then raise exception \'Ce choix est définitif.\'; end if;';
 if position(before_text in source)=0 then raise exception 'Unexpected choice command version'; end if;
 source:=replace(source,before_text,after_text);
 execute source;
 select pg_get_functiondef('public.destin_snapshot_server(uuid,uuid)'::regprocedure) into source;
 before_text:=E' return jsonb_build_object(\'run\',to_jsonb(r)-\'user_id\',\'storyId\',sid,\'manifest\',m,';
 after_text:=E' -- Send only the current scene. Unchosen media never reaches the viewer.\n m:=jsonb_set(m,\'{nodes}\',coalesce((select jsonb_agg(jsonb_set(n,\'{timeout}\',\'0\'::jsonb)) from jsonb_array_elements(m->\'nodes\') n where n->>\'id\'=r.node_id),\'[]\'::jsonb));\n m:=jsonb_set(m,\'{entry}\',to_jsonb(r.node_id));\n'||before_text;
 if position(before_text in source)=0 then raise exception 'Unexpected snapshot version'; end if;
 source:=replace(source,before_text,after_text);
 execute source;
end $patch$;
