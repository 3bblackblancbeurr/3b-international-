import {goldMasterTokens} from '../../design-system/tokens.js';
import {hubMissionJournal} from './mission-journal.js';
const SERVICE_GOLD=goldMasterTokens.colors.champagne.toLowerCase();

/** Services use the existing physical building IDs; preferences never mutate rewards. */
const SERVICE_BY_BUILDING=Object.freeze({
 garage_3b:'garage',central_marina:'dock',shipyard_3b:'dock',train_station:'rail',
 ai_textile_lab:'atelier',mode3_studio:'atelier',memory_archives:'archives',living_cards_gallery:'archives',
 city_planning_office:'urbanism',city_gallery:'urbanism',
});
export const HUB_CITY_SERVICE_NAMES=Object.freeze({garage:'Atelier de préparation',dock:'Capitainerie & chantier naval',rail:'Correspondances du 3B Express',atelier:'Atelier des matières',archives:'Archives de la Mémoire',urbanism:'Galerie des Bâtisseurs'});
export function resolveHubCityService(item){return item?.type==='hubBuilding'?SERVICE_BY_BUILDING[item.buildingId]||null:null;}

export const HUB_SERVICE_VEHICLES=Object.freeze([
 Object.freeze({id:'express',name:'3B Express',transport:'train',color:SERVICE_GOLD,role:'Relier les dix quartiers de la cité.',checks:['Carrosserie et roues','Accès aux voitures','Éclairage de bord','Correspondances']}),
 Object.freeze({id:'navette',name:'Navette des Horizons',transport:'boat',color:'#00a8ff',role:'Relier les embarcadères et les jardins par la mer.',checks:['Coque et pont','Accès au débarcadère','Éclairage de navigation','Destination et retour']}),
 Object.freeze({id:'cabine',name:'Cabine des Civilisations',transport:'telepheric',color:'#ce88b5',role:'Rejoindre les stations hautes par câble.',checks:['Cabine et suspension','Ouverture des portes','Éclairage de cabine','Station d’arrivée']}),
]);
export const HUB_ATELIER_MATERIALS=Object.freeze([
 Object.freeze({id:'textile',name:'Tissu mat',roughness:.92,metalness:0,detail:'Trame serrée, lumière douce et coutures contrastées.'}),
 Object.freeze({id:'stone',name:'Pierre claire',roughness:.78,metalness:0,detail:'Grain fin, joints réguliers et bordures champagne.'}),
 Object.freeze({id:'metal',name:'Métal brossé',roughness:.3,metalness:.82,detail:'Surfaces satinées et incrustations lumineuses.'}),
]);
export const HUB_ATELIER_PATTERNS=Object.freeze([['uni','Uni'],['bandes','Bandes'],['damier','Damier'],['insigne','Signature 3B'],['broderie','Broderie']].map(([id,name])=>Object.freeze({id,name})));
export const HUB_SERVICE_PALETTES=Object.freeze([
 Object.freeze({id:'heritage',name:'Héritage',base:'#101a26',accent:SERVICE_GOLD}),
 Object.freeze({id:'matrix',name:'Matrix',base:'#14354a',accent:'#00a8ff'}),
 Object.freeze({id:'solar',name:'Rives du Soleil',base:'#e6ded0',accent:'#d2a451'}),
 Object.freeze({id:'garden',name:'Unité',base:'#264b3e',accent:'#d9c78a'}),
]);
export const HUB_ARCHIVE_RECORDS=Object.freeze([
 Object.freeze({id:'arrival',title:'Une cité pour se rencontrer',topic:'Fondation',missionIds:['first_steps','voices_square'],text:'La Place de l’Héritage accueille les voyageurs avant les portes. Les quartiers relient ceux qui apprennent, fabriquent, transmettent et prennent soin des autres. La cité est leur lieu commun.',placeId:'heritage_welcome'}),
 Object.freeze({id:'workers',title:'Les mains qui ont construit',topic:'Mémoire ouvrière',missionIds:['eight_seeds','golden_pattern'],text:'Le Mémorial des Ouvriers garde la trace des gestes qui ont élevé la cité : assembler, porter, réparer, cultiver. Cet héritage se poursuit dans les ateliers et les jardins, au fil des actions des habitants.',placeId:'workers_memorial'}),
 Object.freeze({id:'circle',title:'Le Cercle Brisé',topic:'Chronique de la cité',missionIds:['first_echo','eight_signals'],text:'Au centre, le cercle incomplet rappelle une mémoire interrompue. Les Archives conservent les traces retrouvées ; la Tour écoute les fréquences qui permettent de rétablir les liens.',placeId:'tower_circle'}),
 Object.freeze({id:'gates',title:'Huit portes, une même cité',topic:'Les héritages',missionIds:['eight_signals'],text:'Culture, Loyauté, Créativité, Ambition, Passion, Élégance, Résilience et Innovation sont les inscriptions des huit portes. Les parcours des Gardiens possèdent leurs propres valeurs : les Archives distinguent ces deux récits.',placeId:'living_cards_gallery'}),
 Object.freeze({id:'horizons',title:'Le réseau des Horizons',topic:'Transports',missionIds:['first_steps','silent_cable','boat_without_flag','wagon_eight'],text:'Le train, les navettes maritimes et les lignes suspendues relient les quartiers. Les embarquements se font dans les stations physiques ; leurs trajets font partie de l’exploration et des missions du hub.',placeId:'central_marina'}),
 Object.freeze({id:'living-city',title:'La cité reprend vie',topic:'Mémoire du voyage',missionIds:['blue_blackout','voices_square','living_fabric'],text:'Un relais réparé, une rencontre organisée ou une fibre stabilisée laisse une trace dans le journal. Les Archives présentent les missions réellement accomplies et les objectifs encore ouverts, sans transformer une lecture en récompense.',placeId:'ai_textile_lab'}),
]);

const has=(rows,id)=>rows.some(row=>row.id===id);
const color=value=>typeof value==='string'&&/^#[0-9a-f]{6}$/i.test(value)?value.toLowerCase():null;
export function blankHubServicePreferences(){return {version:1,favorites:[],vehicle:{id:'navette',finish:'heritage',purpose:'inspection',checks:[]},atelier:{material:'textile',base:'#101a26',accent:SERVICE_GOLD,pattern:'broderie'}};}
export function normalizeHubServicePreferences(input){
 const result=blankHubServicePreferences(),source=input&&typeof input==='object'&&!Array.isArray(input)?input:{};
 if(source.version!==1)return result;
 result.favorites=[...new Set(Array.isArray(source.favorites)?source.favorites:[])].filter(id=>has(HUB_ARCHIVE_RECORDS,id));
 const vehicle=source.vehicle&&typeof source.vehicle==='object'?source.vehicle:{};
 if(has(HUB_SERVICE_VEHICLES,vehicle.id))result.vehicle.id=vehicle.id;
 if(has(HUB_SERVICE_PALETTES,vehicle.finish))result.vehicle.finish=vehicle.finish;
 if(['inspection','liaison','secours'].includes(vehicle.purpose))result.vehicle.purpose=vehicle.purpose;
 result.vehicle.checks=[...new Set(Array.isArray(vehicle.checks)?vehicle.checks:[])].filter(index=>Number.isInteger(index)&&index>=0&&index<4);
 const atelier=source.atelier&&typeof source.atelier==='object'?source.atelier:{};
 if(has(HUB_ATELIER_MATERIALS,atelier.material))result.atelier.material=atelier.material;
 result.atelier.base=color(atelier.base)||result.atelier.base;result.atelier.accent=color(atelier.accent)||result.atelier.accent;
 if(has(HUB_ATELIER_PATTERNS,atelier.pattern))result.atelier.pattern=atelier.pattern;
 return result;
}
export function hubServiceStorageKey(accountId=null){return '3b-hub-city-services:v1:'+encodeURIComponent(typeof accountId==='string'&&accountId.trim()?accountId.trim().slice(0,128):'guest');}
export function loadHubServicePreferences(accountId=null,storage){try{const target=storage===undefined?globalThis.localStorage:storage;return normalizeHubServicePreferences(JSON.parse(target?.getItem(hubServiceStorageKey(accountId))||'null'));}catch{return blankHubServicePreferences();}}
export function saveHubServicePreferences(input,accountId=null,storage){const value=normalizeHubServicePreferences(input);try{const target=storage===undefined?globalThis.localStorage:storage;if(!target)return {ok:false,value};target.setItem(hubServiceStorageKey(accountId),JSON.stringify(value));return {ok:true,value};}catch{return {ok:false,value};}}
export function hubPaletteAvatarPatch(input){const atelier=normalizeHubServicePreferences({version:1,atelier:input}).atelier;return {fabricColor:atelier.base,accentColor:atelier.accent,pattern:atelier.pattern};}

export function hubServiceArchive(save={}){
 const missions=hubMissionJournal(save),visited=new Set(save.hub?.stats?.buildingVisits||[]);
 return HUB_ARCHIVE_RECORDS.map(record=>({...record,visited:visited.has(record.placeId),missions:missions.filter(row=>record.missionIds.includes(row.id))}));
}

/** Destinations are taken from live runtime markers, never from an unbuilt plan. */
export function hubServiceConnections(items=[],{district='docks',transport=null}={}){
 const stations=items.filter(item=>item.type==='hubTransport'&&item.boardable!==false&&(!transport||item.transport===transport)&&Number.isFinite(item.x)&&Number.isFinite(item.z));
 return stations.filter(station=>station.district===district).map(station=>{
  const sameLine=items.filter(item=>item.type==='hubTransport'&&item.transport===station.transport&&(item.line||item.transport)===(station.line||station.transport)&&Number.isFinite(item.x)&&Number.isFinite(item.z)).sort((a,b)=>(a.stopIndex??0)-(b.stopIndex??0));
  const index=sameLine.findIndex(item=>item.id===station.id),next=station.transport==='zipline'?sameLine.find(item=>(item.stopIndex??0)>(station.stopIndex??0)):sameLine.length>1?sameLine[(index+1)%sameLine.length]:null;
  return {station,next:next||null,stops:sameLine};
 });
}
export function hubServiceMissionTarget(items,missionId){return items.find(item=>item.type==='hubMissionAction'&&item.missionId===missionId)||items.find(item=>item.type==='hubMission'&&item.missionId===missionId)||null;}
