
alter table public.member_profiles
  add column if not exists public_badge_key text,
  add column if not exists public_title text,
  add column if not exists public_verified boolean not null default false;

alter table public.community_profiles
  add column if not exists public_badge_key text,
  add column if not exists public_title text,
  add column if not exists public_verified boolean not null default false;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid='public.member_profiles'::regclass
      and conname='member_profiles_public_identity_check'
  ) then
    alter table public.member_profiles
      add constraint member_profiles_public_identity_check
      check (
        (public_badge_key is null or public_badge_key ~ '^[a-z0-9_-]{3,40}$')
        and (public_title is null or char_length(public_title) between 3 and 80)
        and (not public_verified or (public_badge_key is not null and public_title is not null))
      );
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid='public.community_profiles'::regclass
      and conname='community_profiles_public_identity_check'
  ) then
    alter table public.community_profiles
      add constraint community_profiles_public_identity_check
      check (
        (public_badge_key is null or public_badge_key ~ '^[a-z0-9_-]{3,40}$')
        and (public_title is null or char_length(public_title) between 3 and 80)
        and (not public_verified or (public_badge_key is not null and public_title is not null))
      );
  end if;
end $$;

create unique index if not exists member_profiles_director_founder_unique
  on public.member_profiles(public_badge_key)
  where public_badge_key='director_founder' and public_verified=true;

create unique index if not exists community_profiles_director_founder_unique
  on public.community_profiles(public_badge_key)
  where public_badge_key='director_founder' and public_verified=true;

update public.member_profiles
set public_badge_key='director_founder',
    public_title='DIRECTEUR · FONDATEUR 3B',
    public_verified=true
where handle='3binternational';

insert into public.community_profiles(
  user_id,handle,name,bio,kind,listed,
  public_badge_key,public_title,public_verified
)
select
  user_id,handle,name,'Fondateur de 3B International.','creator',true,
  public_badge_key,public_title,public_verified
from public.member_profiles
where handle='3binternational' and public_verified=true
on conflict (user_id) do update
set handle=excluded.handle,
    name=excluded.name,
    public_badge_key=excluded.public_badge_key,
    public_title=excluded.public_title,
    public_verified=excluded.public_verified;

comment on column public.member_profiles.public_badge_key is
  'Display-only official identity marker. Never use for authorization.';
comment on column public.member_profiles.public_title is
  'Display-only public title. Never use for authorization.';
comment on column public.member_profiles.public_verified is
  'Display-only official verification marker. Never use for authorization.';
comment on column public.community_profiles.public_badge_key is
  'Display-only official identity marker mirrored for community surfaces. Never use for authorization.';
comment on column public.community_profiles.public_title is
  'Display-only public title mirrored for community surfaces. Never use for authorization.';
comment on column public.community_profiles.public_verified is
  'Display-only verification marker mirrored for community surfaces. Never use for authorization.';
