
create index if not exists penalty_club_invites_invited_by_idx
  on public.penalty_club_invites(invited_by);

create index if not exists penalty_ranked_stats_user_id_idx
  on public.penalty_ranked_stats(user_id);
