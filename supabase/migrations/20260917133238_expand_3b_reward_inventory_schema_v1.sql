alter table public.inventory_items drop constraint if exists inventory_items_item_type_check;
alter table public.inventory_items add constraint inventory_items_item_type_check check (item_type = any(array['skin','outfit','effect','vehicle','animation','accessory','badge','collectible','passport_cosmetic','world_object','cosmetic','weapon','companion','tool','blueprint','decoration']));
alter table public.inventory_items drop constraint if exists inventory_items_rarity_check;
alter table public.inventory_items add constraint inventory_items_rarity_check check (rarity = any(array['common','uncommon','rare','epic','special','ultra-rare','legendary','ultimate','mythic','unique']));
