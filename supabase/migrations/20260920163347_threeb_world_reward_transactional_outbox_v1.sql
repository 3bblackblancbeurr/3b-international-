create table if not exists public.threeb_reward_outbox (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  reward_code text not null references public.reward_definitions(code),
  event_id text not null check (event_id ~ '^[A-Za-z0-9:_-]{3,160}$'),
  source text not null default 'world' check (length(source) between 2 and 40),
  status text not null default 'pending'
    check (status in ('pending','credited','rejected')),
  attempts smallint not null default 0 check (attempts between 0 and 100),
  last_error text,
  created_at timestamptz not null default now(),
  processed_at timestamptz,
  unique(user_id,reward_code,event_id)
);

alter table public.threeb_reward_outbox enable row level security;
revoke all on public.threeb_reward_outbox from anon, authenticated;
grant select,insert,update,delete on public.threeb_reward_outbox to service_role;

create index if not exists threeb_reward_outbox_pending_idx
on public.threeb_reward_outbox(status,user_id,created_at,id);

create or replace function public.world_commit_v2(
  p_user uuid,
  p_revision bigint,
  p_data jsonb,
  p_device uuid,
  p_sequence bigint,
  p_rewards jsonb default '[]'::jsonb
)
returns boolean
language plpgsql
set search_path to ''
as $$
declare
  current_revision bigint;
  old_sequence bigint;
  item jsonb;
  reward_code text;
  event_id text;
  source text;
begin
  if p_rewards is null or jsonb_typeof(p_rewards)<>'array' or jsonb_array_length(p_rewards)>100 then
    raise exception 'invalid_reward_outbox';
  end if;

  select revision into current_revision
  from public.member_world_state
  where user_id=p_user
  for update;

  if current_revision is null or current_revision<>p_revision then
    return false;
  end if;

  select sequence into old_sequence
  from public.member_world_devices
  where user_id=p_user and device=p_device;

  if p_sequence<coalesce(old_sequence,0) then
    return false;
  end if;

  update public.member_world_state
  set data=p_data,revision=revision+1,updated_at=now()
  where user_id=p_user;

  insert into public.member_world_devices(user_id,device,sequence)
  values(p_user,p_device,p_sequence)
  on conflict(user_id,device) do update set sequence=excluded.sequence;

  for item in select value from jsonb_array_elements(p_rewards)
  loop
    reward_code:=item->>'rewardCode';
    event_id:=item->>'eventId';
    source:=coalesce(nullif(item->>'source',''),'world');

    if reward_code is null
       or event_id is null
       or event_id !~ '^[A-Za-z0-9:_-]{3,160}$'
       or length(source)>40
       or not exists(select 1 from public.reward_definitions where code=reward_code and active=true) then
      raise exception 'invalid_reward_intent';
    end if;

    insert into public.threeb_reward_outbox(user_id,reward_code,event_id,source)
    values(p_user,reward_code,event_id,source)
    on conflict(user_id,reward_code,event_id) do nothing;
  end loop;

  return true;
end
$$;

revoke all on function public.world_commit_v2(uuid,bigint,jsonb,uuid,bigint,jsonb)
from public,anon,authenticated;
grant execute on function public.world_commit_v2(uuid,bigint,jsonb,uuid,bigint,jsonb)
to service_role;

create or replace function public.threeb_process_reward_outbox_server(
  p_user uuid,
  p_limit integer default 32
)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $$
declare
  row public.threeb_reward_outbox%rowtype;
  result jsonb;
  err text;
  credited_count integer:=0;
  rejected_count integer:=0;
  pending_count integer:=0;
  limit_value integer:=least(50,greatest(1,coalesce(p_limit,32)));
begin
  if p_user is null then raise exception 'invalid_user'; end if;

  for row in
    select *
    from public.threeb_reward_outbox
    where user_id=p_user and status='pending'
    order by id
    for update skip locked
    limit limit_value
  loop
    begin
      update public.threeb_reward_outbox
      set attempts=attempts+1,last_error=null
      where id=row.id;

      result:=public.threeb_credit_reward_server(row.user_id,row.reward_code,row.event_id);

      update public.threeb_reward_outbox
      set status='credited',processed_at=now(),last_error=null
      where id=row.id;

      credited_count:=credited_count+1;
    exception when others then
      err:=sqlerrm;

      if err in (
        'reward_daily_event_cap',
        'reward_daily_value_cap',
        'reward_already_claimed',
        'reward_level_required',
        'unknown_reward',
        'reward_policy_missing'
      ) then
        update public.threeb_reward_outbox
        set status='rejected',processed_at=now(),last_error=err
        where id=row.id;
        rejected_count:=rejected_count+1;
      elsif err='reward_cooldown' then
        update public.threeb_reward_outbox
        set status='pending',last_error=err
        where id=row.id;
        pending_count:=pending_count+1;
      else
        update public.threeb_reward_outbox
        set status=case when attempts+1>=5 then 'rejected' else 'pending' end,
            processed_at=case when attempts+1>=5 then now() else null end,
            last_error=left(err,240)
        where id=row.id;

        if row.attempts+1>=5 then
          rejected_count:=rejected_count+1;
        else
          pending_count:=pending_count+1;
        end if;
      end if;
    end;
  end loop;

  return jsonb_build_object(
    'credited',credited_count,
    'rejected',rejected_count,
    'pending',pending_count
  );
end
$$;

revoke all on function public.threeb_process_reward_outbox_server(uuid,integer)
from public,anon,authenticated;
grant execute on function public.threeb_process_reward_outbox_server(uuid,integer)
to service_role;
