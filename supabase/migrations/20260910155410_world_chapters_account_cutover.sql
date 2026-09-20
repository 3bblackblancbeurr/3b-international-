-- Server-owned continuation of the existing world saves. Legacy data stays recoverable.
create table if not exists public.member_world_state (
 user_id uuid primary key references auth.users(id) on delete cascade,
 data jsonb not null check(jsonb_typeof(data)='object' and pg_column_size(data)<300000),
 revision bigint not null default 1 check(revision>0),
 legacy boolean not null default false,
 walk_baseline bigint not null default 0,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create table if not exists public.member_world_devices (
 user_id uuid not null references auth.users(id) on delete cascade,
 device uuid not null,
 sequence bigint not null default 0 check(sequence>=0),
 primary key(user_id,device)
);
alter table public.member_world_state enable row level security;
alter table public.member_world_devices enable row level security;
revoke all on public.member_world_state,public.member_world_devices from public,anon,authenticated;
grant all on public.member_world_state,public.member_world_devices to service_role;
-- No browser write grant or public RPC can change inventory, XP or battle results.
insert into public.member_world_state(user_id,data,legacy,walk_baseline)
 select user_id,data,true,case when jsonb_typeof(data->'walked')='number' then greatest(0,least(10000000,(data->>'walked')::numeric))::bigint else 0 end from public.member_world_saves
 on conflict(user_id) do nothing;
revoke insert,update on public.member_world_saves from anon,authenticated;

create or replace function public.world_commit(p_user uuid,p_revision bigint,p_data jsonb,p_device uuid,p_sequence bigint)
returns boolean language plpgsql security invoker set search_path='' as $$
declare current_revision bigint; old_sequence bigint;
begin
 select revision into current_revision from public.member_world_state where user_id=p_user for update;
 if current_revision is null or current_revision<>p_revision then return false; end if;
 select sequence into old_sequence from public.member_world_devices where user_id=p_user and device=p_device;
 if p_sequence<coalesce(old_sequence,0) then return false; end if;
 update public.member_world_state set data=p_data,revision=revision+1,updated_at=now() where user_id=p_user;
 insert into public.member_world_devices(user_id,device,sequence) values(p_user,p_device,p_sequence)
 on conflict(user_id,device) do update set sequence=excluded.sequence;
 return true;
end $$;
revoke all on function public.world_commit(uuid,bigint,jsonb,uuid,bigint) from public,anon,authenticated;
grant execute on function public.world_commit(uuid,bigint,jsonb,uuid,bigint) to service_role;
