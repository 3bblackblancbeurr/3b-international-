create index if not exists nosbloc_invitations_invited_by_idx
  on public.nosbloc_invitations(invited_by);
create index if not exists nosbloc_invitations_project_idx
  on public.nosbloc_invitations(project_id);
create index if not exists nosbloc_moderation_assigned_idx
  on public.nosbloc_moderation_queue(assigned_to)
  where assigned_to is not null;
create index if not exists nosbloc_moderation_project_idx
  on public.nosbloc_moderation_queue(project_id);
create index if not exists nosbloc_versions_created_by_idx
  on public.nosbloc_project_versions(created_by);
create index if not exists nosbloc_projects_review_version_idx
  on public.nosbloc_projects(review_version_id)
  where review_version_id is not null;
