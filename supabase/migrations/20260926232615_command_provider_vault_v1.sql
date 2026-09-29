create or replace function public.command_provider_vault_read()
returns jsonb
language sql
security definer
set search_path = pg_catalog, public, vault
as $$
  with allowed(key, secret_name) as (
    values
      ('COMMAND_GOOGLE_CLIENT_ID','3b_command_google_client_id'),
      ('COMMAND_GOOGLE_CLIENT_SECRET','3b_command_google_client_secret'),
      ('COMMAND_GOOGLE_REFRESH_TOKEN','3b_command_google_refresh_token'),
      ('COMMAND_METRICOOL_TOKEN','3b_command_metricool_token'),
      ('COMMAND_METRICOOL_USER_ID','3b_command_metricool_user_id'),
      ('COMMAND_METRICOOL_BLOG_ID','3b_command_metricool_blog_id'),
      ('COMMAND_VERCEL_TOKEN','3b_command_vercel_token'),
      ('COMMAND_VERCEL_PROJECT_ID','3b_command_vercel_project_id'),
      ('COMMAND_VERCEL_TEAM_ID','3b_command_vercel_team_id'),
      ('OPENAI_API_KEY','3b_command_openai_api_key'),
      ('COMMAND_AI_MODEL','3b_command_ai_model'),
      ('COMMAND_STRIPE_SECRET_KEY','3b_command_stripe_secret_key')
  )
  select coalesce(jsonb_object_agg(a.key, d.decrypted_secret), '{}'::jsonb)
  from allowed a
  join vault.decrypted_secrets d on d.name = a.secret_name;
$$;

create or replace function public.command_provider_vault_status()
returns jsonb
language sql
security definer
set search_path = pg_catalog, public, vault
as $$
  with allowed(key, secret_name) as (
    values
      ('COMMAND_GOOGLE_CLIENT_ID','3b_command_google_client_id'),
      ('COMMAND_GOOGLE_CLIENT_SECRET','3b_command_google_client_secret'),
      ('COMMAND_GOOGLE_REFRESH_TOKEN','3b_command_google_refresh_token'),
      ('COMMAND_METRICOOL_TOKEN','3b_command_metricool_token'),
      ('COMMAND_METRICOOL_USER_ID','3b_command_metricool_user_id'),
      ('COMMAND_METRICOOL_BLOG_ID','3b_command_metricool_blog_id'),
      ('COMMAND_VERCEL_TOKEN','3b_command_vercel_token'),
      ('COMMAND_VERCEL_PROJECT_ID','3b_command_vercel_project_id'),
      ('COMMAND_VERCEL_TEAM_ID','3b_command_vercel_team_id'),
      ('OPENAI_API_KEY','3b_command_openai_api_key'),
      ('COMMAND_AI_MODEL','3b_command_ai_model'),
      ('COMMAND_STRIPE_SECRET_KEY','3b_command_stripe_secret_key')
  )
  select jsonb_object_agg(a.key, (d.id is not null))
  from allowed a
  left join vault.decrypted_secrets d on d.name = a.secret_name;
$$;

create or replace function public.command_provider_vault_write(p_values jsonb)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, vault
as $$
declare
  v_key text;
  v_value text;
  v_name text;
  v_id uuid;
  v_result jsonb := '{}'::jsonb;
begin
  if p_values is null or jsonb_typeof(p_values) <> 'object' then
    raise exception using errcode='22023', message='provider configuration must be a JSON object';
  end if;

  if jsonb_object_length(p_values) > 12 then
    raise exception using errcode='22023', message='too many provider configuration values';
  end if;

  for v_key, v_value in
    select key, value from jsonb_each_text(p_values)
  loop
    v_name := case v_key
      when 'COMMAND_GOOGLE_CLIENT_ID' then '3b_command_google_client_id'
      when 'COMMAND_GOOGLE_CLIENT_SECRET' then '3b_command_google_client_secret'
      when 'COMMAND_GOOGLE_REFRESH_TOKEN' then '3b_command_google_refresh_token'
      when 'COMMAND_METRICOOL_TOKEN' then '3b_command_metricool_token'
      when 'COMMAND_METRICOOL_USER_ID' then '3b_command_metricool_user_id'
      when 'COMMAND_METRICOOL_BLOG_ID' then '3b_command_metricool_blog_id'
      when 'COMMAND_VERCEL_TOKEN' then '3b_command_vercel_token'
      when 'COMMAND_VERCEL_PROJECT_ID' then '3b_command_vercel_project_id'
      when 'COMMAND_VERCEL_TEAM_ID' then '3b_command_vercel_team_id'
      when 'OPENAI_API_KEY' then '3b_command_openai_api_key'
      when 'COMMAND_AI_MODEL' then '3b_command_ai_model'
      when 'COMMAND_STRIPE_SECRET_KEY' then '3b_command_stripe_secret_key'
      else null
    end;

    if v_name is null then
      raise exception using errcode='22023', message='unsupported provider configuration key';
    end if;

    if v_value is null or length(v_value) < 1 or octet_length(v_value) > 16384 or position(chr(0) in v_value) > 0 then
      raise exception using errcode='22023', message='invalid provider configuration value';
    end if;

    select id into v_id
    from vault.decrypted_secrets
    where name = v_name
    limit 1;

    if v_id is null then
      perform vault.create_secret(
        v_value,
        v_name,
        '3B Command OS provider configuration',
        null
      );
    else
      perform vault.update_secret(
        v_id,
        v_value,
        v_name,
        '3B Command OS provider configuration',
        null
      );
    end if;

    v_result := v_result || jsonb_build_object(v_key, true);
  end loop;

  return v_result;
end;
$$;

create or replace function public.command_provider_vault_delete(p_keys text[])
returns integer
language plpgsql
security definer
set search_path = pg_catalog, public, vault
as $$
declare
  v_key text;
  v_name text;
  v_count integer := 0;
  v_rows integer := 0;
begin
  if p_keys is null or coalesce(array_length(p_keys,1),0) > 12 then
    raise exception using errcode='22023', message='invalid provider configuration key list';
  end if;

  foreach v_key in array p_keys loop
    v_name := case v_key
      when 'COMMAND_GOOGLE_CLIENT_ID' then '3b_command_google_client_id'
      when 'COMMAND_GOOGLE_CLIENT_SECRET' then '3b_command_google_client_secret'
      when 'COMMAND_GOOGLE_REFRESH_TOKEN' then '3b_command_google_refresh_token'
      when 'COMMAND_METRICOOL_TOKEN' then '3b_command_metricool_token'
      when 'COMMAND_METRICOOL_USER_ID' then '3b_command_metricool_user_id'
      when 'COMMAND_METRICOOL_BLOG_ID' then '3b_command_metricool_blog_id'
      when 'COMMAND_VERCEL_TOKEN' then '3b_command_vercel_token'
      when 'COMMAND_VERCEL_PROJECT_ID' then '3b_command_vercel_project_id'
      when 'COMMAND_VERCEL_TEAM_ID' then '3b_command_vercel_team_id'
      when 'OPENAI_API_KEY' then '3b_command_openai_api_key'
      when 'COMMAND_AI_MODEL' then '3b_command_ai_model'
      when 'COMMAND_STRIPE_SECRET_KEY' then '3b_command_stripe_secret_key'
      else null
    end;

    if v_name is null then
      raise exception using errcode='22023', message='unsupported provider configuration key';
    end if;

    delete from vault.secrets where name = v_name;
    get diagnostics v_rows = row_count;
    v_count := v_count + v_rows;
  end loop;

  return v_count;
end;
$$;

revoke all on function public.command_provider_vault_read() from public, anon, authenticated;
revoke all on function public.command_provider_vault_status() from public, anon, authenticated;
revoke all on function public.command_provider_vault_write(jsonb) from public, anon, authenticated;
revoke all on function public.command_provider_vault_delete(text[]) from public, anon, authenticated;

grant execute on function public.command_provider_vault_read() to service_role;
grant execute on function public.command_provider_vault_status() to service_role;
grant execute on function public.command_provider_vault_write(jsonb) to service_role;
grant execute on function public.command_provider_vault_delete(text[]) to service_role;

comment on function public.command_provider_vault_read() is 'Service-role-only decrypted provider config for 3B Command OS.';
comment on function public.command_provider_vault_status() is 'Service-role-only configured flags for 3B Command OS provider Vault.';
comment on function public.command_provider_vault_write(jsonb) is 'Service-role-only allowlisted writer for 3B Command OS provider Vault.';
comment on function public.command_provider_vault_delete(text[]) is 'Service-role-only allowlisted delete for 3B Command OS provider Vault.';
