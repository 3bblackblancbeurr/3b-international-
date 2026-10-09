-- Supabase default privileges may already grant service_role ALL on new tables.
-- Remove those inherited table grants before restoring only the RPC runtime rights.
begin;

revoke all on public.invisible_echo_contributions,
 public.invisible_echo_solutions,public.invisible_events,
 public.invisible_event_contributions,public.invisible_event_solutions
 from service_role;

grant select,insert on public.invisible_echo_contributions,
 public.invisible_echo_solutions,public.invisible_event_contributions,
 public.invisible_event_solutions to service_role;
grant select on public.invisible_events to service_role;
grant update(completed_at) on public.invisible_events to service_role;

commit;
