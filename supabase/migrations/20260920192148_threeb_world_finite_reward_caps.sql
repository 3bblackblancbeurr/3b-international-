update public.threeb_reward_policy
set max_events_lifetime = case reward_code
  when 'world_memory' then 24
  when 'world_zone' then 16
  else max_events_lifetime
end,
updated_at=now()
where reward_code in ('world_memory','world_zone');
