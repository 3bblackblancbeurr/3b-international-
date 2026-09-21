drop policy if exists penalty_rooms_member_signal_select
on public.penalty_rooms;

create policy penalty_rooms_member_signal_select
on public.penalty_rooms
for select
to authenticated
using ((select auth.uid()) = any(member_ids));
