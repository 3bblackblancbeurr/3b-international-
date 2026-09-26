
alter table public.penalty_international_selections
  add column if not exists assessment_score numeric(5,1) not null default 0,
  add column if not exists assessment jsonb not null default '{}'::jsonb,
  add column if not exists accepted_at timestamptz,
  add column if not exists finalized_at timestamptz;

alter table public.penalty_international_windows
  add column if not exists squads_finalized_at timestamptz;

alter table public.penalty_international_selections
  drop constraint if exists penalty_international_selections_status_check;
alter table public.penalty_international_selections
  add constraint penalty_international_selections_status_check
  check(status in ('preselected','accepted','selected','declined','released'));

do $$
begin
  if not exists(select 1 from pg_constraint where conname='penalty_international_selections_assessment_score_check') then
    alter table public.penalty_international_selections
      add constraint penalty_international_selections_assessment_score_check
      check(assessment_score between 0 and 100);
  end if;
  if not exists(select 1 from pg_constraint where conname='penalty_international_selections_assessment_size_check') then
    alter table public.penalty_international_selections
      add constraint penalty_international_selections_assessment_size_check
      check(jsonb_typeof(assessment)='object' and pg_column_size(assessment)<=4096);
  end if;
end $$;

create index if not exists penalty_international_selection_finalization_idx
  on public.penalty_international_selections(window_id,country_id,status,assessment_score desc,created_at asc);

create or replace function public.penalty_finalize_international_window_server(p_window uuid)
returns boolean
language plpgsql
security definer
set search_path=''
as $$
declare
  v_window public.penalty_international_windows%rowtype;
  v_country text;
begin
  select * into v_window
  from public.penalty_international_windows
  where id=p_window
  for update;

  if not found then return false; end if;
  if v_window.squads_finalized_at is not null then return false; end if;
  if now()<=v_window.selection_closes_at then return false; end if;

  foreach v_country in array array['fr','dz','ma','tn','tr','it','es','ee']
  loop
    with ranked as (
      select id,
        row_number() over(order by assessment_score desc,created_at asc,id asc) as rn
      from public.penalty_international_selections
      where window_id=p_window
        and country_id=v_country
        and status='accepted'
    )
    update public.penalty_international_selections s
    set status=case when ranked.rn<=v_window.squad_size then 'selected' else 'released' end,
        finalized_at=now(),
        updated_at=now()
    from ranked
    where s.id=ranked.id;
  end loop;

  update public.penalty_international_selections
  set status='released',finalized_at=now(),updated_at=now()
  where window_id=p_window and status='preselected';

  update public.penalty_international_windows
  set squads_finalized_at=now()
  where id=p_window;

  return true;
end;
$$;

revoke all on function public.penalty_finalize_international_window_server(uuid) from public,anon,authenticated;
grant execute on function public.penalty_finalize_international_window_server(uuid) to service_role;

comment on function public.penalty_finalize_international_window_server(uuid) is
  'Finalizes each national squad after call-up closes, ranking accepted candidates by server assessment score instead of response order.';
