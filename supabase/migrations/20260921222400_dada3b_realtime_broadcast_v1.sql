create or replace function public.dada3b_broadcast_room_changes()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  perform realtime.broadcast_changes(
    'dada:room:' || coalesce(new.id, old.id)::text,
    tg_op,
    tg_op,
    tg_table_name,
    tg_table_schema,
    new,
    old
  );
  return null;
end;
$$;

revoke all on function public.dada3b_broadcast_room_changes() from public, anon, authenticated;

drop trigger if exists dada3b_room_realtime on public.dada_rooms;
create trigger dada3b_room_realtime
after insert or update or delete on public.dada_rooms
for each row execute function public.dada3b_broadcast_room_changes();

drop policy if exists dada3b_room_broadcast_receive on realtime.messages;
create policy dada3b_room_broadcast_receive
on realtime.messages
for select
to authenticated
using (
  exists (
    select 1
    from public.dada_rooms r
    where r.id::text = split_part((select realtime.topic()), ':', 3)
      and (select auth.uid()) = any(r.member_ids)
  )
);
