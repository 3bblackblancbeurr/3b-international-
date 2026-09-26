-- Applied only to Supabase project zykdfgahzqqanlyxjtbe.
create index if not exists nosbloc_stg_audit_actor_idx on public.nosbloc_stg_audit_log(actor_id,created_at desc);
create index if not exists nosbloc_stg_audit_project_idx on public.nosbloc_stg_audit_log(project_id,created_at desc);
create index if not exists nosbloc_stg_invited_by_idx on public.nosbloc_stg_invitations(invited_by,created_at desc);
create index if not exists nosbloc_stg_invited_user_idx on public.nosbloc_stg_invitations(invited_user_id,status,expires_at);
create index if not exists nosbloc_stg_moderation_assignee_idx on public.nosbloc_stg_moderation_queue(assigned_to,status,created_at);
create index if not exists nosbloc_stg_moderation_project_idx on public.nosbloc_stg_moderation_queue(project_id,status,created_at);
create index if not exists nosbloc_stg_members_user_idx on public.nosbloc_stg_project_members(user_id,membership_status,updated_at desc);
create index if not exists nosbloc_stg_versions_creator_idx on public.nosbloc_stg_project_versions(created_by,created_at desc);
create index if not exists nosbloc_stg_projects_review_version_idx on public.nosbloc_stg_projects(review_version_id) where review_version_id is not null;
