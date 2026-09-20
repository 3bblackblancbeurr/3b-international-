begin;
-- Retire the unused, anonymous legacy chat without deleting its history.
revoke all on public.messages from public,anon,authenticated;
create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;
select cron.schedule('3b-sport-daily','0 4 * * *',$job$select net.http_get(url := 'https://ttvhcezucsbbmnafrotq.supabase.co/functions/v1/ecosystem?section=sports', timeout_milliseconds := 30000);$job$);
commit;
