create unique index if not exists item_instances_owner_origin_ref_unique
on public.item_instances(owner_id,origin_ref)
where owner_id is not null and origin_ref is not null;

create or replace function public.market_mint_item(
  p_user uuid,
  p_item_code text,
  p_origin text,
  p_origin_ref text,
  p_metadata jsonb
)
returns uuid
language plpgsql
set search_path to ''
as $$
declare
  d public.inventory_items;
  n bigint;
  new_id uuid;
  existing_id uuid;
  existing_code text;
  normalized_origin_ref text:=nullif(trim(coalesce(p_origin_ref,'')),'');
begin
  if p_user is null then
    raise exception 'Compte joueur invalide';
  end if;

  if p_origin not in (
    'milestone','game_reward','achievement','event_reward',
    'passport','shop_bundle','admin_grant','sponsor_event'
  ) then
    raise exception 'Origine d objet invalide';
  end if;

  if normalized_origin_ref is not null then
    perform pg_advisory_xact_lock(
      hashtextextended(
        'item-origin:'||p_user::text||':'||normalized_origin_ref,
        0
      )
    );

    select id,item_code
    into existing_id,existing_code
    from public.item_instances
    where owner_id=p_user
      and origin_ref=normalized_origin_ref
    limit 1;

    if existing_id is not null then
      if existing_code<>p_item_code then
        raise exception 'origin_ref_conflict';
      end if;
      return existing_id;
    end if;
  end if;

  select * into d
  from public.inventory_items
  where code=p_item_code and active=true
  for update;

  if not found then
    raise exception 'Objet 3B introuvable';
  end if;

  n=d.minted_count+1;
  if d.max_supply is not null and n>d.max_supply then
    raise exception 'Stock numérique épuisé';
  end if;

  insert into public.item_instances(
    item_code,serial_no,owner_id,origin,origin_ref,metadata
  )
  values(
    p_item_code,n,p_user,p_origin,normalized_origin_ref,
    coalesce(p_metadata,'{}'::jsonb)
  )
  returning id into new_id;

  update public.inventory_items
  set minted_count=n
  where code=p_item_code;

  insert into public.item_transfer_history(
    item_instance_id,to_user,reason,reference_id
  )
  values(new_id,p_user,'mint',new_id);

  return new_id;
end
$$;

revoke all on function public.market_mint_item(uuid,text,text,text,jsonb)
from public,anon,authenticated;
grant execute on function public.market_mint_item(uuid,text,text,text,jsonb)
to service_role;