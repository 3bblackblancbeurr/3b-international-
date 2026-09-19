export const HUB_EVENT_IDS = [
 'market_night','heavy_rain_echo','train_breakdown','guardian_projection','dock_fog',
 'arena_public_challenge','power_flicker','memory_walk','city_showcase','workers_ceremony',
];
export const HUB_SECRET_IDS = [
 'secret_last_train','secret_waterfall_door','secret_three_lights','secret_rain_symbol',
 'secret_silent_cabin','secret_roof_signal','secret_abandoned_quay','secret_workers_names',
 'secret_lost_station','secret_broken_elevator','secret_arena_floor','secret_market_code',
 'secret_city_guest','secret_fog_tree','secret_archive_reverse','secret_train_window',
];
export const HUB_DISTRICT_IDS=[
 'heritage_square','broken_circle_tower','archives','arena','commerce','community','innovation','docks','city3b_portal','gardens',
];
export const HUB_NPC_IDS=[
 'ines_varga','mael_rivière','celine_moreau','samir_benyahia','lyna_amrane','nora_khelifi','hugo_martel','sofia_vega',
 'leyla_demir','maarja_saar','giulia_ferri','omar_el_fassi','amira_mansouri','elio_romano','arda_kaya','evelin_tamm',
 'youssef_ben_salem','lucia_navaro','meryem_alaoui','noah_leroux','the_conductor','kadra_zerrouki','adrian_sol','soraya_najem',
];
export const HUB_TRANSPORT_TYPES=['train','boat'];
export const HUB_SECRET_STEP_COUNTS={
 secret_three_lights:3,
 secret_rain_symbol:3,
 secret_workers_names:8,
 secret_broken_elevator:1,
 secret_archive_reverse:4,
};
export const HUB_SECRET_STEP_SET=new Set(Object.keys(HUB_SECRET_STEP_COUNTS));
export const HUB_EVENT_SET=new Set(HUB_EVENT_IDS);
export const HUB_SECRET_SET=new Set(HUB_SECRET_IDS);
export const HUB_DISTRICT_SET=new Set(HUB_DISTRICT_IDS);
export const HUB_NPC_SET=new Set(HUB_NPC_IDS);
export const HUB_TRANSPORT_SET=new Set(HUB_TRANSPORT_TYPES);
