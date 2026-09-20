begin;
update public.inventory_items set permanent=true, metadata=coalesce(metadata,'{}'::jsonb)||jsonb_build_object('seasonal',false,'expires',false,'pay_to_win',false) where active=true;
update public.subscription_plans set benefits=benefits||jsonb_build_object('season_pass',false,'loot_box_bonus',false,'rarity_drop_bonus',false,'combat_power_bonus',false,'purchased_coin_bonus',false) where code in ('pass3b','premium3b');
commit;
