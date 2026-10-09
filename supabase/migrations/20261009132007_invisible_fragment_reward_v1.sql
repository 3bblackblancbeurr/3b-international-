-- A dedicated finite reward preserves the existing world-secret and mission caps.
insert into public.reward_definitions(code,label,xp,coins,active,repeatable)
values ('invisible_fragment','Monde Invisible · Fragment de la Justice',120,15,true,false)
on conflict(code) do update set
 label=excluded.label,xp=excluded.xp,coins=excluded.coins,
 active=excluded.active,repeatable=excluded.repeatable;

insert into public.threeb_reward_policy(
 reward_code,policy_version,max_events_per_day,daily_xp_cap,daily_coins_cap,
 cooldown_seconds,diminishing,min_global_level,sensitive,active,max_events_lifetime,updated_at
)
values ('invisible_fragment','2026.invisible.1',1,120,15,0,'[1,0]'::jsonb,1,false,true,1,now())
on conflict(reward_code) do update set
 policy_version=excluded.policy_version,max_events_per_day=excluded.max_events_per_day,
 daily_xp_cap=excluded.daily_xp_cap,daily_coins_cap=excluded.daily_coins_cap,
 cooldown_seconds=excluded.cooldown_seconds,diminishing=excluded.diminishing,
 min_global_level=excluded.min_global_level,sensitive=excluded.sensitive,
 active=excluded.active,max_events_lifetime=excluded.max_events_lifetime,updated_at=now();
