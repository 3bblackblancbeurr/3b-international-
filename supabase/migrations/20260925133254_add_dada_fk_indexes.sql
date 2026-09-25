create index if not exists dada_tournament_matches_winner_user_id_idx
  on public.dada_tournament_matches (winner_user_id);

create index if not exists dada_tournaments_created_by_idx
  on public.dada_tournaments (created_by);
