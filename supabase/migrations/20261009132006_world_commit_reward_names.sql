-- Keep the existing CAS transaction and privileges. Distinct local names avoid
-- PL/pgSQL ambiguity in the outbox's ON CONFLICT column target.
create or replace function public.world_commit_v2(
 p_user uuid,p_revision bigint,p_data jsonb,p_device uuid,p_sequence bigint,
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
 v_reward_code text;
 v_event_id text;
 v_source text;
begin
 if p_rewards is null or jsonb_typeof(p_rewards)<>'array' or jsonb_array_length(p_rewards)>100 then
  raise exception 'invalid_reward_outbox';
 end if;

 select revision into current_revision
 from public.member_world_state where user_id=p_user for update;
 if current_revision is null or current_revision<>p_revision then return false;end if;

 select sequence into old_sequence
 from public.member_world_devices where user_id=p_user and device=p_device;
 if p_sequence<coalesce(old_sequence,0) then return false;end if;

 update public.member_world_state
 set data=p_data,revision=revision+1,updated_at=now() where user_id=p_user;

 insert into public.member_world_devices(user_id,device,sequence)
 values(p_user,p_device,p_sequence)
 on conflict(user_id,device) do update set sequence=excluded.sequence;

 for item in select value from jsonb_array_elements(p_rewards)
 loop
  v_reward_code:=item->>'rewardCode';
  v_event_id:=item->>'eventId';
  v_source:=coalesce(nullif(item->>'source',''),'world');
  if v_reward_code is null or v_event_id is null
     or v_event_id !~ '^[A-Za-z0-9:_-]{3,160}$' or length(v_source)>40
     or not exists(select 1 from public.reward_definitions where code=v_reward_code and active=true) then
   raise exception 'invalid_reward_intent';
  end if;
  insert into public.threeb_reward_outbox(user_id,reward_code,event_id,source)
  values(p_user,v_reward_code,v_event_id,v_source)
  on conflict(user_id,reward_code,event_id) do nothing;
 end loop;
 return true;
end
$$;
