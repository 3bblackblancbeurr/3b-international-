alter table public.member_consents drop constraint if exists member_consents_kind_check;
alter table public.member_consents
  add constraint member_consents_kind_check
  check (kind in ('terms','privacy','marketing','identity'));

comment on column public.member_consents.kind is
  'Versioned consent kind. identity is separate from terms/privacy and records consent to process self-declared identity data for verification workflows.';
