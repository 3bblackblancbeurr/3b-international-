-- Applied only to Supabase project zykdfgahzqqanlyxjtbe.
-- A moderator can only be created from a private, one-time signup-code label.
create or replace function private.nosbloc_stg_require_signup_code()
returns trigger
language plpgsql
security definer
set search_path=private,extensions,public,pg_temp
as $$
declare
  v_code text:=trim(coalesce(new.raw_user_meta_data->>'nosbloc_invite_code',''));
  v_hash text;
  v_label text;
begin
  if char_length(v_code)<16 or char_length(v_code)>80 then
    raise exception 'nosbloc_staging_invite_required';
  end if;
  v_hash:=encode(extensions.digest(v_code,'sha256'),'hex');
  update private.nosbloc_stg_signup_codes
  set used_count=used_count+1,last_used_by=new.id,last_used_at=now()
  where code_hash=v_hash and used_count<max_uses and expires_at>now()
  returning label into v_label;
  if not found then raise exception 'nosbloc_staging_invite_invalid';end if;
  new.raw_user_meta_data:=coalesce(new.raw_user_meta_data,'{}'::jsonb)-'nosbloc_invite_code';
  if v_label='moderator-test' then
    new.raw_app_meta_data:=coalesce(new.raw_app_meta_data,'{}'::jsonb)
      ||jsonb_build_object('nosbloc_staging_moderator',true);
  end if;
  return new;
end$$;

create or replace function private.nosbloc_stg_handle_new_user()
returns trigger
language plpgsql
security definer
set search_path=public,auth,pg_temp
as $$
declare
  v_requested text;
  v_handle text;
  v_name text;
  v_country public.nosbloc_stg_country;
  v_moderator boolean:=coalesce((new.raw_app_meta_data->>'nosbloc_staging_moderator')::boolean,false);
begin
  v_requested:=coalesce(new.raw_user_meta_data->>'handle',split_part(coalesce(new.email,''),'@',1));
  v_handle:=private.nosbloc_stg_normalize_handle(v_requested,new.id);
  if exists(select 1 from public.member_profiles where handle=v_handle) then
    v_handle:=left(v_handle,17)||'-'||substr(replace(new.id::text,'-',''),1,6);
  end if;
  v_name:=left(trim(coalesce(new.raw_user_meta_data->>'display_name',new.raw_user_meta_data->>'name',v_handle)),80);
  if char_length(v_name)<2 then v_name:=v_handle;end if;
  begin
    v_country:=coalesce(nullif(new.raw_user_meta_data->>'country','')::public.nosbloc_stg_country,'France');
  exception when others then
    v_country:='France';
  end;
  insert into public.member_profiles(
    user_id,handle,name,country,public_badge_key,public_title,public_verified
  ) values(
    new.id,v_handle,v_name,v_country,
    case when v_moderator then 'director_founder' end,
    case when v_moderator then 'Modérateur Nosbloc staging' end,
    v_moderator
  ) on conflict(user_id) do nothing;
  return new;
end$$;

comment on function private.nosbloc_stg_require_signup_code() is
'Consumes one-time signup codes and assigns moderator privilege only from the private code label.';
