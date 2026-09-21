create index if not exists dada_rooms_host_user_idx
on public.dada_rooms(host_user_id);

create index if not exists dada_rooms_winner_user_idx
on public.dada_rooms(winner_user_id);

create index if not exists dada_room_events_actor_user_idx
on public.dada_room_events(actor_user_id);