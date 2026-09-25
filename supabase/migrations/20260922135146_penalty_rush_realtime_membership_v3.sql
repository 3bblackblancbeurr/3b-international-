
create table if not exists public.penalty_room_members (
  room_id uuid not null references public.penalty_rooms(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key(room_id,user_id)
);

create index if not exists penalty_room_members_user_room_idx
  on public.penalty_room_members(user_id,room_id);

alter table public.penalty_room_members enable row level security;

revoke all on public.penalty_room_members from anon;
revoke all on public.penalty_room_members from authenticated;
grant select on public.penalty_room_members to authenticated;

drop policy if exists penalty_room_members_self_select on public.penalty_room_members;
create policy penalty_room_members_self_select
on public.penalty_room_members
for select
to authenticated
using ((select auth.uid()) = user_id);

create or replace function public.penalty_sync_room_members()
returns trigger
language plpgsql
security invoker
set search_path to ''
as $function$
begin
  delete from public.penalty_room_members m
  where m.room_id=new.id
    and not (m.user_id=any(coalesce(new.member_ids,'{}'::uuid[])));

  insert into public.penalty_room_members(room_id,user_id)
  select new.id,member_id
  from unnest(coalesce(new.member_ids,'{}'::uuid[])) as member_id
  on conflict(room_id,user_id) do nothing;

  return new;
end;
$function$;

revoke all on function public.penalty_sync_room_members() from public,anon,authenticated;
grant execute on function public.penalty_sync_room_members() to service_role;

drop trigger if exists penalty_rooms_sync_members on public.penalty_rooms;
create trigger penalty_rooms_sync_members
after insert or update of member_ids on public.penalty_rooms
for each row execute function public.penalty_sync_room_members();

insert into public.penalty_room_members(room_id,user_id)
select r.id,member_id
from public.penalty_rooms r
cross join lateral unnest(coalesce(r.member_ids,'{}'::uuid[])) as member_id
on conflict(room_id,user_id) do nothing;

drop policy if exists penalty_room_broadcast_receive on realtime.messages;
create policy penalty_room_broadcast_receive
on realtime.messages
for select
to authenticated
using (
  extension='broadcast'
  and split_part((select realtime.topic()),':',1)='penalty'
  and exists (
    select 1
    from public.penalty_room_members m
    where m.user_id=(select auth.uid())
      and m.room_id::text=split_part((select realtime.topic()),':',2)
  )
);
