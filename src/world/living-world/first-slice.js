import {CHARACTER_RARITIES,MISSION_CATEGORIES} from './catalog.js';

export const AMBIENT_NPC_PROFILES=Object.freeze([
 {id:'ambient-commuter',role:'Voyageur du 3B Express',districts:['heritage-square','docks','archives'],schedules:['morning','day','evening'],behaviours:['walk','wait','board-train']},
 {id:'ambient-dock-worker',role:'Ouvrier des docks',districts:['docks'],schedules:['morning','day'],behaviours:['carry','repair','talk']},
 {id:'ambient-student',role:'Étudiant des Archives',districts:['archives','heritage-square'],schedules:['morning','day'],behaviours:['walk','read','talk']},
 {id:'ambient-family',role:'Famille en visite',districts:['heritage-square','unity-gardens'],schedules:['day','evening'],behaviours:['walk','observe','photo']},
 {id:'ambient-merchant',role:'Marchand itinérant',districts:['commerce','heritage-square'],schedules:['day','evening'],behaviours:['open-stall','sell','talk']},
 {id:'ambient-athlete',role:'Combattant en entraînement',districts:['arena'],schedules:['day','evening'],behaviours:['warm-up','train','rest']},
 {id:'ambient-gardener',role:'Jardinier de l’Unité',districts:['unity-gardens'],schedules:['morning','day'],behaviours:['water','prune','talk']},
 {id:'ambient-creator',role:'Créateur 3B',districts:['innovation','commerce'],schedules:['day','evening'],behaviours:['design','observe','talk']},
 {id:'ambient-security',role:'Veilleur de quartier',districts:['heritage-square','archives','docks'],schedules:['evening','night'],behaviours:['patrol','observe','react']},
 {id:'ambient-tourist',role:'Explorateur des huit portes',districts:['heritage-square','archives','docks'],schedules:['day','evening'],behaviours:['walk','photo','consult-map']},
 {id:'ambient-musician',role:'Musicien de rue',districts:['heritage-square','community'],schedules:['evening','night'],behaviours:['perform','rest','talk']},
 {id:'ambient-medic',role:'Soignant mobile',districts:['arena','heritage-square'],schedules:['day','evening'],behaviours:['walk','assist','talk']},
 {id:'ambient-mechanic',role:'Mécanicien de navettes',districts:['docks','commerce'],schedules:['morning','day'],behaviours:['repair','inspect','carry']},
 {id:'ambient-archivist',role:'Archiviste itinérant',districts:['archives','broken-circle'],schedules:['day','night'],behaviours:['scan','read','walk']},
 {id:'ambient-sailor',role:'Marin de la Ligne des Reflets',districts:['docks','city-3b'],schedules:['morning','evening'],behaviours:['board-boat','unload','talk']},
 {id:'ambient-photographer',role:'Photographe des panoramas',districts:['broken-circle','unity-gardens'],schedules:['day','evening'],behaviours:['photo','observe','walk']},
 {id:'ambient-courier',role:'Coursier interquartiers',districts:['commerce','community','docks'],schedules:['morning','day','evening'],behaviours:['run','deliver','wait']},
 {id:'ambient-researcher',role:'Chercheur Matrix',districts:['innovation','archives'],schedules:['day','night'],behaviours:['scan','type','talk']},
 {id:'ambient-builder',role:'Urbaniste de Ville 3B',districts:['city-3b','docks'],schedules:['day'],behaviours:['inspect','measure','talk']},
 {id:'ambient-night-vendor',role:'Vendeur du marché nocturne',districts:['commerce','docks'],schedules:['night'],behaviours:['open-stall','sell','whisper']},
]);

export const FUNCTIONAL_NPCS=Object.freeze([
 {id:'npc-guide-heritage',name:'Ariane Mercier',role:'Guide de la Place',district:'heritage-square',service:'orientation'},
 {id:'npc-archivist-circle',name:'Inès Varga',role:'Archiviste du Cercle',district:'archives',service:'restore-memory'},
 {id:'npc-station-master',name:'Idris Benali',role:'Chef de gare du 3B Express',district:'docks',service:'train-travel'},
 {id:'npc-harbour-master',name:'Lina Haddad',role:'Capitaine de la Ligne des Reflets',district:'docks',service:'boat-travel'},
 {id:'npc-garage-mechanic',name:'Milo Rossi',role:'Mécanicien du Garage 3B',district:'commerce',service:'vehicle-service'},
 {id:'npc-cable-operator',name:'Aylin Demir',role:'Opératrice des téléphériques',district:'innovation',service:'cable-car-travel'},
 {id:'npc-city-planner',name:'Samira El Mansouri',role:'Urbaniste de Ville 3B',district:'city-3b',service:'city-building'},
 {id:'npc-arena-trainer',name:'Noé Calderón',role:'Entraîneur de l’Arène',district:'arena',service:'combat-training'},
]);

export const NARRATIVE_NPCS=Object.freeze([
 {id:'npc-celiane',name:'Céliane',role:'Gardienne de la Justice',district:'archives',rarity:'legendary',country:'france'},
 {id:'npc-yliane',name:'Yliane',role:'Gardienne de la Loyauté',district:'docks',rarity:'legendary',country:'algerie'},
 {id:'npc-oren',name:'Oren',role:'Veilleur des Portes',district:'broken-circle',rarity:'epic',country:null},
 {id:'npc-daria',name:'Daria',role:'Ingénieure du Cercle',district:'innovation',rarity:'rare',country:null},
 {id:'npc-maarja',name:'Maarja Saar',role:'Chasseuse de Signaux',district:'archives',rarity:'epic',country:'estonie'},
 {id:'npc-amir',name:'Amir Selim',role:'Veilleur des Sables',district:'docks',rarity:'epic',country:'algerie'},
]);

export const SECRET_NPCS=Object.freeze([
 {id:'npc-last-train-traveller',name:'Le Voyageur sans station',district:'docks',rarity:'unique',conditions:['time:night','transport:last-train'],initialMarker:false},
 {id:'npc-harbour-ghost-captain',name:'La Capitaine du quai effacé',district:'docks',rarity:'unique',conditions:['weather:fog','transport:boat'],initialMarker:false},
]);

export const FIRST_SLICE_MISSIONS=Object.freeze([
 {id:'mission-arrival-eight-paths',title:'Huit chemins, un héritage',category:'main',district:'heritage-square',initialMarker:true,durationMinutes:8,rewards:['map-hub','xp']},
 {id:'mission-archives-first-echo',title:'Le premier Écho',category:'main',district:'archives',initialMarker:true,durationMinutes:16,rewards:['memory-fragment','card-ines-varga']},
 {id:'mission-train-restart',title:'La ligne interrompue',category:'district',district:'docks',initialMarker:true,durationMinutes:12,rewards:['train-access','district-reputation']},
 {id:'mission-docks-rescue',title:'Un signal sur l’eau',category:'dynamic',district:'docks',initialMarker:true,durationMinutes:7,rewards:['coins','docks-reputation']},
 {id:'mission-commerce-lost-delivery',title:'Le colis aux huit sceaux',category:'citizen',district:'commerce',initialMarker:true,durationMinutes:6,rewards:['craft-material','coins']},
 {id:'mission-gardens-memory',title:'Les racines se souviennent',category:'district',district:'unity-gardens',initialMarker:true,durationMinutes:10,rewards:['city-decoration','memory-seed']},
 {id:'mission-secret-last-train',title:'Le dernier train ne s’arrête pas',category:'secret',district:'docks',initialMarker:false,durationMinutes:14,rewards:['unique-card','secret-carriage-access']},
 {id:'mission-secret-fog-boat',title:'Le quai qui disparaît',category:'secret',district:'docks',initialMarker:false,durationMinutes:12,rewards:['unique-card','boat-skin']},
 {id:'mission-france-rumour',title:'La voix de la Justice',category:'guardian',district:'archives',initialMarker:true,durationMinutes:9,rewards:['france-gate-clue']},
 {id:'mission-algeria-rumour',title:'Le serment sous la pierre',category:'guardian',district:'docks',initialMarker:true,durationMinutes:9,rewards:['algeria-gate-clue']},
 {id:'mission-power-outage',title:'La ville dans le noir',category:'dynamic',district:'innovation',initialMarker:true,durationMinutes:5,rewards:['innovation-reputation','coins']},
 {id:'mission-gate-instability',title:'La Porte respire',category:'weekly',district:'broken-circle',initialMarker:true,durationMinutes:25,rewards:['weekly-cache','fragment-dust']},
]);

export const FIRST_SLICE_EVENTS=Object.freeze([
 {id:'event-market-pop-up',district:'heritage-square',kind:'market',durationMinutes:8},
 {id:'event-light-outage',district:'innovation',kind:'outage',durationMinutes:5},
 {id:'event-heavy-rain',district:'docks',kind:'weather',durationMinutes:7},
 {id:'event-echo-appearance',district:'archives',kind:'echo',durationMinutes:4},
 {id:'event-guardian-intervention',district:'broken-circle',kind:'guardian',durationMinutes:6},
 {id:'event-boat-delay',district:'docks',kind:'transport',durationMinutes:5},
]);

const npcGroups=[AMBIENT_NPC_PROFILES,FUNCTIONAL_NPCS,NARRATIVE_NPCS,SECRET_NPCS];
export function validateFirstSliceContent(validDistricts){
 const errors=[],npcIds=npcGroups.flat().map(n=>n.id),missionIds=FIRST_SLICE_MISSIONS.map(m=>m.id),eventIds=FIRST_SLICE_EVENTS.map(e=>e.id);
 const unique=(values,label)=>{if(new Set(values).size!==values.length)errors.push(`${label} contient des identifiants dupliqués.`);};
 unique(npcIds,'PNJ');unique(missionIds,'Missions');unique(eventIds,'Événements');
 if(AMBIENT_NPC_PROFILES.length!==20)errors.push('La première tranche doit définir 20 profils de PNJ d’ambiance.');
 if(FUNCTIONAL_NPCS.length!==8)errors.push('La première tranche doit définir 8 PNJ fonctionnels.');
 if(NARRATIVE_NPCS.length!==6)errors.push('La première tranche doit définir 6 PNJ narratifs.');
 if(SECRET_NPCS.length!==2)errors.push('La première tranche doit définir 2 PNJ secrets.');
 if(FIRST_SLICE_MISSIONS.length!==12)errors.push('La première tranche doit définir 12 missions.');
 if(FIRST_SLICE_EVENTS.length!==6)errors.push('La première tranche doit définir 6 micro-événements.');
 for(const npc of npcGroups.flat()){for(const district of npc.districts||[npc.district])if(!validDistricts.has(district))errors.push(`Quartier inconnu pour ${npc.id}: ${district}.`);if(npc.rarity&&!CHARACTER_RARITIES.includes(npc.rarity))errors.push(`Rareté inconnue pour ${npc.id}.`);}
 for(const mission of FIRST_SLICE_MISSIONS){if(!validDistricts.has(mission.district))errors.push(`Quartier inconnu pour ${mission.id}.`);if(!MISSION_CATEGORIES.includes(mission.category))errors.push(`Catégorie inconnue pour ${mission.id}.`);if(mission.category==='secret'&&mission.initialMarker!==false)errors.push(`${mission.id} ne doit pas afficher de marqueur initial.`);if(!mission.rewards.length)errors.push(`${mission.id} doit proposer une récompense.`);}
 for(const event of FIRST_SLICE_EVENTS){if(!validDistricts.has(event.district))errors.push(`Quartier inconnu pour ${event.id}.`);if(event.durationMinutes<2||event.durationMinutes>8)errors.push(`${event.id} doit rester un événement court de 2 à 8 minutes.`);}
 return errors;
}
