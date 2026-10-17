import {CANON_WORLDS, GUARDIAN_STORIES, STORY_CANON} from '../world/story-canon.js';

export const MANGA_LIBRARY_KEY='threeb_manga_library_v1';
const COUNTRIES={france:'France',algerie:'Algérie',maroc:'Maroc',tunisie:'Tunisie',espagne:'Espagne',italie:'Italie',turquie:'Turquie',estonie:'Estonie'};
const foundation=(id,title,subtitle,paragraphs,spoiler=false)=>({id,title,subtitle,kind:'repere',paragraphs,spoiler});
export const MANGA_READINGS=Object.freeze([
 foundation('kais',STORY_CANON.hero.name,STORY_CANON.hero.role,[['Son parcours',STORY_CANON.hero.journey],['L’anneau',STORY_CANON.hero.ring],['Son rôle',STORY_CANON.hero.rule]]),
 foundation('circle',STORY_CANON.circle.name,'La mémoire des huit héritages',[['Le Cercle',STORY_CANON.circle.purpose],['Les huit Portes',STORY_CANON.circle.eight],['La Rupture',STORY_CANON.circle.rupture]]),
 foundation('oubli','L’Oubli','Comprendre la force qui sépare',[['Sa nature',STORY_CANON.oubli.nature],['Sa manifestation',STORY_CANON.oubli.monster],['Ce qu’il n’est pas',STORY_CANON.oubli.falseAnswer]]),
 ...Object.entries(CANON_WORLDS).map(([id,canon])=>{const story=GUARDIAN_STORIES[id];return {id,title:canon.guardian,subtitle:`${COUNTRIES[id]} · ${canon.value}`,kind:'gardien',country:COUNTRIES[id],value:canon.value,paragraphs:[['Tempérament',story.temperament],['Fragilité',story.flaw],['Crainte',story.fear],['Son chemin',story.conflict],['Face à l’Oubli',story.oubli],['Le lien avec Kaïs',story.kais]]};}),
 foundation('finale','Le Cercle retrouvé','Les révélations du récit',[['Le Lien',STORY_CANON.finale.revelation],['La victoire',STORY_CANON.finale.victory],['Après la Rupture',STORY_CANON.finale.aftermath]],true),
]);
export const MANGA_READING_IDS=Object.freeze(MANGA_READINGS.map(item=>item.id));
const known=id=>MANGA_READING_IDS.includes(id);
const idList=value=>Array.isArray(value)?[...new Set(value.filter(known))]:[];
export function normalizeMangaLibrary(value){return {version:1,readIds:idList(value?.readIds),favoriteIds:idList(value?.favoriteIds),lastId:known(value?.lastId)?value.lastId:'kais'};}
export function loadMangaLibrary(storage){
 let raw=null;
 try{raw=(storage??globalThis.localStorage).getItem(MANGA_LIBRARY_KEY);if(raw===null)return {state:normalizeMangaLibrary(),raw,warning:''};const parsed=JSON.parse(raw);if(parsed?.version!==1||!Array.isArray(parsed.readIds)||!Array.isArray(parsed.favoriteIds))throw new Error('format');return {state:normalizeMangaLibrary(parsed),raw,warning:''};}
 catch{return {state:normalizeMangaLibrary(),raw,warning:'Ton suivi enregistré est indisponible. Tu peux continuer la lecture et exporter ton suivi pendant cette session.'};}
}
export function saveMangaLibrary(value,expectedRaw,storage){
 const state=normalizeMangaLibrary(value);
 try{const target=storage??globalThis.localStorage;const current=target.getItem(MANGA_LIBRARY_KEY);if(current!==expectedRaw)return {saved:false,conflict:true,...loadMangaLibrary(target)};if(current!==null&&loadMangaLibrary(target).warning)target.setItem(`${MANGA_LIBRARY_KEY}_recovery`,current);const raw=JSON.stringify(state);target.setItem(MANGA_LIBRARY_KEY,raw);return {saved:true,conflict:false,state,raw,warning:''};}
 catch{return {saved:false,conflict:false,state,raw:expectedRaw,warning:'Le suivi reste dans cette session : le stockage de cet appareil est indisponible. Exporte-le pour le conserver.'};}
}
export function setReadingLocation(state,id){if(!known(id))throw new Error('Repère inconnu.');return {...normalizeMangaLibrary(state),lastId:id};}
export function toggleReadingState(state,id,field){if(!known(id)||!['readIds','favoriteIds'].includes(field))throw new Error('Action de lecture invalide.');const next=normalizeMangaLibrary(state);next[field]=next[field].includes(id)?next[field].filter(value=>value!==id):[...next[field],id];return next;}
export function searchMangaReadings(query='',kind='all',favoriteIds=null){const fold=value=>String(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();const words=fold(query).trim().split(/\s+/).filter(Boolean);return MANGA_READINGS.filter(item=>(kind==='all'||item.kind===kind)&&(!favoriteIds||favoriteIds.includes(item.id))&&words.every(word=>fold([item.title,item.subtitle,...item.paragraphs.flat()].join(' ')).includes(word)));}
export function exportMangaLibrary(state){return JSON.stringify({format:'3b-manga-library',...normalizeMangaLibrary(state)},null,2);}
export function mergeMangaLibrary(state,text){
 if(typeof text!=='string'||text.length>20000)throw new Error('Ce fichier de suivi est trop volumineux.');
 let imported;try{imported=JSON.parse(text);}catch{throw new Error('Le fichier ne contient pas un suivi JSON valide.');}
 if(imported?.format!=='3b-manga-library'||imported.version!==1||!Array.isArray(imported.readIds)||!Array.isArray(imported.favoriteIds)||imported.readIds.length>12||imported.favoriteIds.length>12||!imported.readIds.every(known)||!imported.favoriteIds.every(known)||!known(imported.lastId))throw new Error('Ce suivi ne correspond pas aux repères du Manga 3B.');
 const current=normalizeMangaLibrary(state);return {...current,readIds:[...new Set([...current.readIds,...imported.readIds])],favoriteIds:[...new Set([...current.favoriteIds,...imported.favoriteIds])]};
}
