create function public.world_party_runtime_state_guard()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
declare
  v_state public.member_world_state%rowtype;
  v_enc jsonb;
  v_field jsonb;
  v_max_hp integer;
  v_hp integer;
begin
  if old.life_state<>'downed' then
    return new;
  end if;

  select * into v_state
  from public.member_world_state
  where user_id=new.user_id
  for update;

  v_enc:=v_state.data#>'{adventure,encounter}';

  if new.life_state='downed' then
    if v_state.user_id is null or coalesce(v_enc->>'result','')<>'defeat' then
      new.life_state:='active';
      new.downed_at:=null;
    end if;
    return new;
  end if;

  if new.life_state='active' then
    if new.revived_at is null and v_state.user_id is not null and coalesce(v_enc->>'result','')='defeat' then
      new.life_state:='downed';
      new.downed_at:=old.downed_at;
      return new;
    end if;

    if new.revived_at is not null and v_state.user_id is not null and coalesce(v_enc->>'result','')='defeat' then
      begin
        v_max_hp:=greatest(1,least(500,(v_enc->>'maxHP')::integer));
      exception when others then
        v_max_hp:=100;
      end;
      v_hp:=greatest(1,ceil(v_max_hp*.35)::integer);
      v_enc:=jsonb_set(v_enc,'{hp}',to_jsonb(v_hp),true);
      v_enc:=jsonb_set(v_enc,'{result}','null'::jsonb,true);
      v_enc:=jsonb_set(v_enc,'{log}',to_jsonb('Un allié t’a réanimé. Reprends tes appuis et éloigne-toi du danger.'::text),true);

      if jsonb_typeof(v_enc->'field')='object' then
        v_field:=v_enc->'field';
        v_field:=jsonb_set(v_field,'{stamina}',to_jsonb(greatest(35,coalesce((v_field->>'stamina')::integer,35))),true);
        v_field:=jsonb_set(v_field,'{phase}',to_jsonb('recovery'::text),true);
        v_field:=jsonb_set(v_field,'{recover}',to_jsonb(1200),true);
        v_field:=jsonb_set(v_field,'{windup}',to_jsonb(0),true);
        v_field:=jsonb_set(v_field,'{cooldown}',to_jsonb(450),true);
        v_field:=jsonb_set(v_field,'{last}','null'::jsonb,true);
        v_enc:=jsonb_set(v_enc,'{field}',v_field,true);
      end if;

      update public.member_world_state
      set data=jsonb_set(data,'{adventure,encounter}',v_enc,true),
          revision=revision+1,
          updated_at=now()
      where user_id=new.user_id;
    end if;
  end if;

  return new;
end
$$;

revoke all on function public.world_party_runtime_state_guard() from public,anon,authenticated;

create trigger world_party_runtime_state_guard_before_update
before update of life_state,downed_at,revived_at,updated_at
on public.world_party_runtime
for each row execute function public.world_party_runtime_state_guard();