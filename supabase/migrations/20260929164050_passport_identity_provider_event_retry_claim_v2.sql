alter table public.passport_identity_provider_events
  add column if not exists processing_started_at timestamptz,
  add column if not exists last_attempt_at timestamptz,
  add column if not exists attempt_count integer not null default 0;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid='public.passport_identity_provider_events'::regclass
      and conname='passport_identity_provider_events_attempt_count_check'
  ) then
    alter table public.passport_identity_provider_events
      add constraint passport_identity_provider_events_attempt_count_check
      check (attempt_count between 0 and 1000000);
  end if;
end $$;

create or replace function public.passport_identity_provider_event_claim(
  p_provider text,
  p_event_id text,
  p_event_name text,
  p_event_version text default null
)
returns table(
  event_db_id bigint,
  claimed boolean,
  already_processed boolean,
  in_progress boolean,
  attempts integer
)
language plpgsql
security definer
set search_path='public','pg_temp'
as $$
declare
  v_event public.passport_identity_provider_events%rowtype;
  v_attempts integer;
begin
  if p_provider !~ '^[a-z0-9._:-]{2,64}$'
     or char_length(coalesce(p_event_id,'')) not between 8 and 128
     or p_event_name !~ '^[a-z0-9._:-]{3,80}$' then
    raise exception 'invalid provider event claim';
  end if;

  insert into public.passport_identity_provider_events(provider,event_id,event_name,event_version)
  values(p_provider,p_event_id,p_event_name,nullif(p_event_version,''))
  on conflict(provider,event_id) do nothing;

  select *
  into v_event
  from public.passport_identity_provider_events
  where provider=p_provider and event_id=p_event_id
  for update;

  if not found then
    raise exception 'provider event claim missing';
  end if;

  if v_event.event_name<>p_event_name
     or coalesce(v_event.event_version,'')<>coalesce(nullif(p_event_version,''),'') then
    raise exception 'provider event metadata mismatch';
  end if;

  if v_event.processed_at is not null then
    return query select v_event.id,false,true,false,v_event.attempt_count;
    return;
  end if;

  if v_event.processing_started_at is not null
     and v_event.processing_started_at > now()-interval '2 minutes' then
    return query select v_event.id,false,false,true,v_event.attempt_count;
    return;
  end if;

  update public.passport_identity_provider_events
  set processing_started_at=now(),
      last_attempt_at=now(),
      attempt_count=attempt_count+1
  where id=v_event.id
  returning attempt_count into v_attempts;

  return query select v_event.id,true,false,false,v_attempts;
end;
$$;

revoke all on function public.passport_identity_provider_event_claim(text,text,text,text)
  from public,anon,authenticated;
grant execute on function public.passport_identity_provider_event_claim(text,text,text,text)
  to service_role;

comment on function public.passport_identity_provider_event_claim(text,text,text,text) is
  'Atomically claims an identity-provider webhook event. Completed events stay idempotent; interrupted events become retryable after a two-minute lease without storing provider payloads or PII.';
