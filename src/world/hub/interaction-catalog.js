export const HUB_DISTRICT_IDS=[
 'heritage_square','broken_circle_tower','archives','arena','commerce','community','innovation','docks','city3b_portal','gardens',
];
export const HUB_DISTRICT_SET=new Set(HUB_DISTRICT_IDS);

export const HUB_NPC_IDS=[
 'ines_varga','mael_rivière','celine_moreau','samir_benyahia','lyna_amrane','nora_khelifi','hugo_martel','sofia_vega',
 'leyla_demir','maarja_saar','giulia_ferri','omar_el_fassi','amira_mansouri','elio_romano','arda_kaya','evelin_tamm',
 'youssef_ben_salem','lucia_navaro','meryem_alaoui','noah_leroux','the_conductor','kadra_zerrouki','adrian_sol','soraya_najem',
];
export const HUB_NPC_SET=new Set(HUB_NPC_IDS);

export const HUB_TRANSIT_IDS=[
 ...HUB_DISTRICT_IDS.map((id)=>'train:'+id),
 ...['docks','gardens','city3b_portal','commerce','heritage_square'].map((id)=>'boat:'+id),
 ...['T1','T2','T3'].map((id)=>'telepheric:'+id),
 ...['Z1','Z2','Z3','Z4','Z5','Z6'].map((id)=>'zipline:'+id),
];
export const HUB_TRANSIT_SET=new Set(HUB_TRANSIT_IDS);
