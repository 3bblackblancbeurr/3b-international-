-- Applied only to Supabase project zykdfgahzqqanlyxjtbe.
-- One-time code hashes are seeded out-of-band and are never committed.
create table if not exists private.nosbloc_stg_signup_codes (
  code_hash char(64) primary key check (code_hash ~ '^[0-9a-f]{64}$'),
  label text not null check (char_length(label) between 2 and 60),
  max_uses integer not null default 1 check (max_uses between 1 and 10),
  used_count integer not null default 0 check (used_count between 0 and max_uses),
  expires_at timestamptz not null,
  last_used_by uuid,
  last_used_at timestamptz,
  created_at timestamptz not null default now(),
  check (expires_at > created_at)
);
revoke all on private.nosbloc_stg_signup_codes from public,anon,authenticated;
grant all on private.nosbloc_stg_signup_codes to service_role;

create or replace function private.nosbloc_stg_require_signup_code()
returns trigger
language plpgsql
security definer
set search_path=private,extensions,public,pg_temp
as $$
declare
  v_code text:=trim(coalesce(new.raw_user_meta_data->>'nosbloc_invite_code',''));
  v_hash text;
begin
  if char_length(v_code)<16 or char_length(v_code)>80 then
    raise exception 'nosbloc_staging_invite_required';
  end if;
  v_hash:=encode(extensions.digest(v_code,'sha256'),'hex');
  update private.nosbloc_stg_signup_codes
  set used_count=used_count+1,last_used_by=new.id,last_used_at=now()
  where code_hash=v_hash and used_count<max_uses and expires_at>now();
  if not found then raise exception 'nosbloc_staging_invite_invalid';end if;
  new.raw_user_meta_data:=coalesce(new.raw_user_meta_data,'{}'::jsonb)-'nosbloc_invite_code';
  return new;
end$$;
revoke all on function private.nosbloc_stg_require_signup_code() from public,anon,authenticated;

drop trigger if exists nosbloc_stg_signup_gate on auth.users;
create trigger nosbloc_stg_signup_gate
before insert on auth.users
for each row execute function private.nosbloc_stg_require_signup_code();

comment on table private.nosbloc_stg_signup_codes is
'One-time invite-only signup gate for the isolated Nosbloc staging project.';
