
update public.app_games_catalog
set metadata = coalesce(metadata,'{}'::jsonb) || jsonb_build_object(
  'loaderSlug','games-remote-loader',
  'loaderVersion',2,
  'backendVersion',10,
  'apiVersion',2,
  'moduleVersion',1,
  'elementTag','penalty-rush-3b',
  'backEvent','penalty-back',
  'routePattern','/jeux/:slug',
  'requiresShellBridge',true,
  'shellContractVersion',1
),
updated_at=now()
where slug='penalty-rush';
