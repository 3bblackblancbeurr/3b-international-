insert into public.threeb_seasons
(code,label,status,starts_at,ends_at,xp_multiplier,coins_multiplier,token_budget,metadata,updated_at)
values (
  'dada_cercle_fondateur',
  'DADA 3B · Cercle Fondateur',
  'draft',
  null,
  null,
  1,
  1,
  0,
  '{
    "game":"dada3b",
    "season_type":"visual_rotation",
    "competitive_rules_unchanged":true,
    "pay_to_win":false,
    "collection":"cercle-fondateur",
    "rotation":[
      {"country":"fr","board":"fr","guardian":"Céliane","value":"Justice"},
      {"country":"dz","board":"dz","guardian":"Yliane","value":"Loyauté"},
      {"country":"es","board":"es","guardian":"Diego","value":"Passion"},
      {"country":"ma","board":"ma","guardian":"Naël","value":"Noblesse"},
      {"country":"it","board":"it","guardian":"Alessio","value":"Espoir"},
      {"country":"tn","board":"tn","guardian":"Soraya","value":"Courage"},
      {"country":"tr","board":"tr","guardian":"Émir","value":"Foi"},
      {"country":"ee","board":"ee","guardian":"Eira","value":"Sagesse"}
    ]
  }'::jsonb,
  now()
)
on conflict(code) do update set
  label=excluded.label,
  status=excluded.status,
  starts_at=excluded.starts_at,
  ends_at=excluded.ends_at,
  xp_multiplier=1,
  coins_multiplier=1,
  token_budget=0,
  metadata=excluded.metadata,
  updated_at=now();