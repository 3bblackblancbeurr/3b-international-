begin;

revoke all on public.world_unreal_story_state from service_role;
revoke all on public.world_unreal_story_receipts from service_role;

grant select, insert, update on public.world_unreal_story_state to service_role;
grant select, insert on public.world_unreal_story_receipts to service_role;

commit;
