-- Owner-only API checks identity before using these service-role-only functions.
create table if not exists public.albert_workspaces (
 user_id uuid primary key references auth.users(id) on delete cascade,
 revision bigint not null default 1,
 payload jsonb not null check (octet_length(payload::text)<=250000),
 updated_at timestamptz not null default now()
);
alter table public.albert_workspaces enable row level security;
revoke all on public.albert_workspaces from public, anon, authenticated;
grant select,insert,update,delete on public.albert_workspaces to service_role;
create or replace function public.albert_workspace_save(p_user uuid,p_revision bigint,p_payload jsonb)
returns jsonb language plpgsql security invoker set search_path=public,pg_temp as $$
declare result_revision bigint;
begin
 if p_revision<0 or octet_length(p_payload::text)>250000 then raise exception 'invalid workspace'; end if;
 if p_revision=0 then
  insert into public.albert_workspaces(user_id,payload) values(p_user,p_payload)
  on conflict(user_id) do nothing returning revision into result_revision;
 else
  update public.albert_workspaces set payload=p_payload,revision=revision+1,updated_at=now()
  where user_id=p_user and revision=p_revision returning revision into result_revision;
 end if;
 if result_revision is null then return jsonb_build_object('conflict',true); end if;
 return jsonb_build_object('revision',result_revision);
end $$;
revoke all on function public.albert_workspace_save(uuid,bigint,jsonb) from public,anon,authenticated;
grant execute on function public.albert_workspace_save(uuid,bigint,jsonb) to service_role;
