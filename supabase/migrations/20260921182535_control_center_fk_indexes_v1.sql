
create index if not exists control_center_events_device_id_idx
  on public.control_center_events(device_id);

create index if not exists control_center_pairings_device_id_idx
  on public.control_center_pairings(device_id);
