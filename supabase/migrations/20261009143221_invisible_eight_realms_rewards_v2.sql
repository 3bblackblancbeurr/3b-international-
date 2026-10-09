-- Each finite adventure has its own cap; France and existing world caps stay unchanged.
begin;
insert into public.reward_definitions(code,label,xp,coins,active,repeatable) values
 ('invisible_fragment_algerie','Monde Invisible · Fragment de la Loyauté',120,15,true,false),
 ('invisible_fragment_maroc','Monde Invisible · Fragment de la Noblesse',120,15,true,false),
 ('invisible_fragment_tunisie','Monde Invisible · Fragment du Courage',120,15,true,false),
 ('invisible_fragment_espagne','Monde Invisible · Fragment de la Passion',120,15,true,false),
 ('invisible_fragment_italie','Monde Invisible · Fragment de l’Espoir',120,15,true,false),
 ('invisible_fragment_turquie','Monde Invisible · Fragment de la Foi',120,15,true,false),
 ('invisible_fragment_estonie','Monde Invisible · Fragment de la Sagesse',120,15,true,false),
 ('invisible_convergence','Monde Invisible · La Convergence des huit héritages',240,30,true,false)
on conflict(code) do update set label=excluded.label,xp=excluded.xp,coins=excluded.coins,active=excluded.active,repeatable=excluded.repeatable;

insert into public.threeb_reward_policy(
 reward_code,policy_version,max_events_per_day,daily_xp_cap,daily_coins_cap,cooldown_seconds,
 diminishing,min_global_level,sensitive,active,max_events_lifetime,updated_at
)
select code,'2026.invisible.2',1,xp,coins,0,'[1,0]'::jsonb,1,false,true,1,now()
from public.reward_definitions where code in (
 'invisible_fragment_algerie','invisible_fragment_maroc','invisible_fragment_tunisie','invisible_fragment_espagne',
 'invisible_fragment_italie','invisible_fragment_turquie','invisible_fragment_estonie','invisible_convergence'
)
on conflict(reward_code) do update set policy_version=excluded.policy_version,max_events_per_day=excluded.max_events_per_day,
 daily_xp_cap=excluded.daily_xp_cap,daily_coins_cap=excluded.daily_coins_cap,cooldown_seconds=excluded.cooldown_seconds,
 diminishing=excluded.diminishing,min_global_level=excluded.min_global_level,sensitive=excluded.sensitive,
 active=excluded.active,max_events_lifetime=excluded.max_events_lifetime,updated_at=now();
commit;
