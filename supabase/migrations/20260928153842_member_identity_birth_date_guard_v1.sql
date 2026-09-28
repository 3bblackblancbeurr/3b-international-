alter table public.member_identity_claims
  drop constraint if exists member_identity_claims_birth_date_check;

alter table public.member_identity_claims
  add constraint member_identity_claims_birth_date_check
  check (birth_date >= date '1900-01-01' and birth_date <= current_date);

comment on constraint member_identity_claims_birth_date_check on public.member_identity_claims is
  'Rejects impossible future birth dates at the database boundary. Application validation remains mandatory.';
