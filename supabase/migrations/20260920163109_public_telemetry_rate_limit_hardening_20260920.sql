-- 3B public telemetry abuse hardening.
-- Keep intentionally public telemetry RPCs available, but bound write amplification
-- by a pseudonymized request-IP key. Raw IP addresses are never stored here.

create or replace function public.app_install_ping(
  p_install_id uuid,
  p_platform text default 'web'::text
)
returns void
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_headers jsonb := coalesce(nullif(current_setting('request.headers', true), ''), '{}')::jsonb;
  v_ip text := split_part(
    coalesce(
      v_headers->>'cf-connecting-ip',
      v_headers->>'x-real-ip',
      v_headers->>'x-forwarded-for',
      'unknown'
    ),
    ',',
    1
  );
  v_rate_key text := pg_catalog.encode(
    extensions.digest('3b-telemetry-install:' || v_ip, 'sha256'),
    'hex'
  );
begin
  if p_install_id is null then return; end if;
  if not public.loyalty_rate(v_rate_key, 120, 60) then return; end if;

  insert into public.app_installs(install_id,platform,first_seen,last_seen)
  values (
    p_install_id,
    left(coalesce(nullif(trim(p_platform),''),'web'),32),
    now(),
    now()
  )
  on conflict (install_id) do update
    set platform=excluded.platform,last_seen=now();
end;
$function$;

create or replace function public.app_presence_ping(
  p_session_id uuid,
  p_platform text default 'web'::text,
  p_page text default 'unknown'::text
)
returns void
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_headers jsonb := coalesce(nullif(current_setting('request.headers', true), ''), '{}')::jsonb;
  v_ip text := split_part(
    coalesce(
      v_headers->>'cf-connecting-ip',
      v_headers->>'x-real-ip',
      v_headers->>'x-forwarded-for',
      'unknown'
    ),
    ',',
    1
  );
  v_rate_key text := pg_catalog.encode(
    extensions.digest('3b-telemetry-presence:' || v_ip, 'sha256'),
    'hex'
  );
begin
  if p_session_id is null then return; end if;
  if not public.loyalty_rate(v_rate_key, 120, 60) then return; end if;

  insert into public.app_presence(session_id,user_id,platform,page,first_seen,last_seen)
  values (
    p_session_id,
    auth.uid(),
    left(coalesce(nullif(trim(p_platform),''),'web'),32),
    left(coalesce(nullif(trim(p_page),''),'unknown'),64),
    now(),
    now()
  )
  on conflict (session_id) do update set
    user_id = coalesce(auth.uid(), public.app_presence.user_id),
    platform = excluded.platform,
    page = excluded.page,
    last_seen = now();
end;
$function$;

revoke all on function public.app_install_ping(uuid,text) from public;
revoke all on function public.app_presence_ping(uuid,text,text) from public;
grant execute on function public.app_install_ping(uuid,text) to anon, authenticated, service_role;
grant execute on function public.app_presence_ping(uuid,text,text) to anon, authenticated, service_role;
