begin;

drop trigger if exists destin_city_reward_guard on public.nexus_city_placements;

drop function if exists public.destin_city_reward_guard();
drop function if exists public.destin_path_reward_server(uuid,uuid,text);
drop function if exists public.destin_claim_server(uuid,uuid,text);
drop function if exists public.destin_command_server(uuid,text,jsonb,boolean);
drop function if exists public.destin_snapshot_server(uuid,uuid);
drop function if exists public.destin_poll_snapshot_server(uuid);
drop function if exists public.passport_destin_access_server_v1(uuid);

delete from public.nexus_city_placements
where building_code in ('DESTIN_MEMORY_PAVILION','DESTIN_FUTURE_WORKSHOP');

drop table if exists public.destin_votes;
drop table if exists public.destin_polls;
drop table if exists public.destin_decisions;
drop table if exists public.destin_path_rewards;
drop table if exists public.destin_unlocks;
drop table if exists public.destin_runs;

alter table if exists public.destin_stories
  drop constraint if exists destin_stories_release_fk;

drop table if exists public.destin_releases;
drop table if exists public.destin_stories;

delete from public.nexus_city_buildings
where code in ('DESTIN_MEMORY_PAVILION','DESTIN_FUTURE_WORKSHOP');

delete from public.item_instances
where item_code in ('DESTIN_MEMORY_KEY','DESTIN_FUTURE_COMPASS');

delete from public.inventory_items
where code in ('DESTIN_MEMORY_KEY','DESTIN_FUTURE_COMPASS');

delete from public.threeb_reward_policy
where reward_code='destin_ending';

delete from public.reward_definitions
where code='destin_ending';

commit;