/** Player-facing Hub copy. Saved IDs and authored conditions remain unchanged. */
import npcs from './data/npcs-v1.json' with {type:'json'};
import missions from './data/missions-v1.json' with {type:'json'};
import plan from './data/hub-master-plan-v2.json' with {type:'json'};

const npcNames=Object.fromEntries(npcs.map(row=>[row.id,row.name]));
const missionNames=Object.fromEntries(missions.map(row=>[row.id,row.title]));
const buildingNames=Object.fromEntries(plan.buildings.map(row=>[row.id,row.name]));
const districtNames=Object.fromEntries(plan.districts.map(row=>[row.id,row.name]));
const categories=Object.freeze({tutorial:'Premiers pas',main:'Histoire de la Cité',district:'Vie du quartier',secret:'Secrets de la Cité',dynamic:'Événement vivant',community:'Communauté',guardian_prelude:'Épreuve du Gardien',collection:'Collection',craft:'Artisanat',innovation:'Innovation',archives:'Mémoire et archives'});
const transports=Object.freeze({train:'3B Express',boat:'Bateau-taxi',zipline:'Tyrolienne',telepheric:'Téléphérique'});
const weather=Object.freeze({clear:'temps dégagé',rain:'temps de pluie',heavy_rain:'forte pluie',storm:'temps de tempête',fog:'temps de brouillard',snow:'temps de neige'});
const events=Object.freeze({market_night:'Marché nocturne',heavy_rain_echo:'L’Écho de la pluie',train_breakdown:'Réparation du 3B Express',guardian_projection:'Message du Gardien',dock_fog:'La Brume des docks',arena_public_challenge:'Défi public de l’Arène',power_flicker:'Les Relais de la nuit',memory_walk:'Promenade des souvenirs',city_showcase:'Exposition des villes',workers_ceremony:'Hommage aux bâtisseurs'});
const rewards=Object.freeze({xp:'XP monde',coins:'Éclats',map_access:'Repères de la carte',fragment_clue:'Indice de fragment',archive_access:'Souvenir des archives',world_event_access:'Découverte des événements',mobility_badge:'Trace de mobilité',boat_skin:'Souvenir maritime',secret_card:'Souvenir secret',dock_reputation:'Reconnaissance des docks',materials:'Souvenir de sauvetage',memory_relic:'Relique de mémoire',ines_card:'Souvenir d’Inès',unique_conductor_card:'Souvenir du Conducteur',train_archive:'Archive du 3B Express',innovation_access:'Relais restaurés',wisdom_clue:'Indice de sagesse',rare_card:'Souvenir rare',community_reputation:'Liens de la communauté',event_unlock:'Rencontre organisée',diego_clue:'Indice du Gardien',telepheric_fast_travel:'Liaison du téléphérique',rare_collection_token:'Trace de collection',garden_set:'Conservatoire restauré',city_decoration:'Trace des jardins',craft_recipe:'Recette artisanale',outfit_material:'Échantillon textile',eira_clue:'Indice de l’animal-signal',wolf_badge:'Souvenir du Loup',lore_audio:'Message restauré'});
const aliases=Object.freeze({'Place du Sol':'Place del Sol','Terrasses de l’Onis':'Terrasses de l’Oasis'});
const technical=value=>/[_:]|^[a-z]+$/.test(value);
const text=value=>typeof value==='string'?value.trim():'';
const readable=(value,fallback)=>{const name=text(value);return name&&!technical(name)?name:fallback;};

export function hubPlaceLabel(value){
 let label=text(value);
 for(const [oldName,name] of Object.entries(aliases))label=label.replaceAll(oldName,name);
 return label;
}
export function hubNpcLabel(value){return npcNames[value]||readable(value,'Un habitant de la Cité');}
export function hubMissionLabel(value){return missionNames[value]||readable(value,'Une histoire de la Cité');}
export function hubDistrictLabel(value){return districtNames[value]||readable(value,'Cité des Huit Héritages');}
export function hubCategoryLabel(value){return categories[value]||'Activité de la Cité';}
export function hubEventLabel(value){return events[value]||readable(value,'Événement de la Cité');}
export function hubRewardLabel(value){return rewards[value]||readable(value,'Progression de la Cité');}
export function hubConditionLabel(value){
 const condition=text(value),separator=condition.indexOf(':'),kind=condition.slice(0,separator),id=condition.slice(separator+1);
 if(separator<0)return hubPlaceLabel(readable(condition,'Explorer la Cité'));
 switch(kind){
  case 'talk':case 'npc':{const name=hubNpcLabel(id);return name.startsWith('Le ')?'Parler au '+name.slice(3):'Parler à '+name;}
  case 'visit':case 'district':return 'Découvrir « '+(buildingNames[id]||hubDistrictLabel(id))+' »';
  case 'building':return 'Visiter '+(buildingNames[id]||'un lieu de la Cité');
  case 'transport':return 'Emprunter '+({train:'le 3B Express',boat:'le bateau-taxi',zipline:'la tyrolienne',telepheric:'le téléphérique'}[id]||'un transport de la Cité');
  case 'event':return 'Découvrir « '+hubEventLabel(id)+' »';
  case 'weather':return 'Explorer par '+(weather[id]||'une météo particulière');
  case 'mission':return 'Terminer « '+hubMissionLabel(id)+' » et récupérer sa récompense';
  default:return 'Explorer la Cité';
 }
}
export function hubObjectiveLabel(value){
 const objective=text(value);
 if(objective.includes(':'))return hubConditionLabel(objective);
 if(npcNames[objective])return 'Rencontrer '+npcNames[objective];
 if(missionNames[objective])return 'Terminer « '+missionNames[objective]+' »';
 return hubPlaceLabel(readable(objective,'Explorer les repères de la Cité'));
}
export function hubItemLabel(item){
 if(item?.type==='hubNpc')return hubNpcLabel(item.npcId||item.name);
 if(item?.type==='hubEvent')return hubEventLabel(item.eventId||item.name);
 return hubPlaceLabel(item?.name||'Lieu de la Cité').replace(/^Borne · /,'');
}
const dialogueNames={...npcNames,...missionNames,...events,...Object.fromEntries(Object.entries(districtNames).filter(([id])=>id.includes('_')))};
const dialogueIds=new RegExp('(?<![\\p{L}\\p{N}_])(?:'+Object.keys(dialogueNames).join('|')+')(?![\\p{L}\\p{N}_])','gu');
export function hubDialogueTextLabel(value){return hubPlaceLabel(text(value)).replace(dialogueIds,id=>dialogueNames[id]);}

const metres=new Intl.NumberFormat('fr-FR',{maximumFractionDigits:1});
export function hubElevationLabel(value,{signed=true}={}){
 if(!Number.isFinite(value))return 'Altitude inconnue';
 const rounded=Math.round(value*10)/10,absolute=Object.is(rounded,-0)?0:rounded;
 return (signed&&absolute>0?'+':'')+metres.format(absolute)+' m';
}
export function hubDistanceLabel(item,position){
 if(![item?.x,item?.z,position?.x,position?.z].every(Number.isFinite))return 'Distance inconnue';
 const distance=Math.hypot(item.x-position.x,item.z-position.z);
 return distance<1?'À proximité':Math.round(distance)>=1000?metres.format(distance/1000)+' km':Math.round(distance)+' m';
}
export function hubSearchMatches(item,query){
 const normalize=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[’']/g,' ').toLocaleLowerCase('fr').replace(/\s+/g,' ').trim();
 const haystack=normalize([hubItemLabel(item),hubDistrictLabel(item.district),item.activity,item.role,item.name,item.district,...(item.functions||[]),item.transport&&transports[item.transport],item.type==='hubMission'&&hubCategoryLabel(item.category),...Object.entries(aliases).filter(([,name])=>hubItemLabel(item).includes(name)).map(([oldName])=>oldName)].filter(Boolean).join(' '));
 return normalize(query).split(' ').filter(Boolean).every(term=>haystack.includes(term));
}
export function hubJournalRows(rows,filter='all'){
 const visible=rows.filter(row=>filter==='available'?!row.locked&&row.status==='available':filter==='active'?row.status==='active':filter==='completed'?row.status==='completed':filter==='locked'?row.locked:true);
 const rank=row=>row.status==='active'?0:row.status==='completed'&&!row.claimed?1:!row.locked&&row.status==='available'?2:row.locked?3:4;
 return [...visible].sort((a,b)=>rank(a)-rank(b));
}
