import {realmSites} from './realm-layout.js';
import {spatialAudio} from './audio-spatial.js';

/**
 * Fictional, original World 3B sound design. These are acoustic cues for the
 * authored locations, not representations of recorded traditional music.
 * One low-cost broadband bed + at most three local sources are mixed by audio.js.
 */
export const REALM_ACOUSTIC_BEDS=Object.freeze({
 france:Object.freeze({name:'Air des passages',frequency:970,volume:.027}),
 algerie:Object.freeze({name:'Vent des terrasses',frequency:530,volume:.030}),
 maroc:Object.freeze({name:'Brise des cours',frequency:790,volume:.026}),
 tunisie:Object.freeze({name:'Souffle des jardins',frequency:1080,volume:.027}),
 espagne:Object.freeze({name:'Air des patios',frequency:1220,volume:.024}),
 italie:Object.freeze({name:'Souffle des collines',frequency:830,volume:.027}),
 turquie:Object.freeze({name:'Vent des chemins',frequency:580,volume:.029}),
 estonie:Object.freeze({name:'Vent de la forêt',frequency:1390,volume:.025}),
});

export const REALM_SITE_ACOUSTICS=Object.freeze({
 arcade:['Pas sous les arcades','activity',720,.026,94],
 chateau:['Parc du château','nature',1350,.024,112],
 alpine:['Sapins des hauteurs','nature',1500,.025,135],
 casbah:['Voix du quartier','activity',630,.025,106],
 oasis:['Feuillage de l’oasis','water',1320,.033,100],
 mountain:['Brise des crêtes','wind',730,.027,145],
 riad:['Fontaine de la cour','water',1840,.032,91],
 coastal:['Vagues du rivage','water',870,.047,144],
 kasbah:['Cours de terre','activity',560,.020,104],
 ruins:['Jardins des vestiges','nature',1100,.025,115],
 aqueduct:['Eau des arcades','water',950,.030,114],
 modernist:['Ateliers du quartier','craft',810,.027,95],
 patio:['Fontaine du patio','water',1550,.029,102],
 windmill:['Vent des moulins','wind',500,.036,150],
 palazzo:['Passants des galeries','activity',780,.024,90],
 vineyard:['Vignes sous le vent','nature',1230,.021,128],
 bazaar:['Activité du bazar','activity',630,.033,106],
 fairychimney:['Écho des vallées','wind',470,.027,148],
 caravanserai:['Ateliers du relais','craft',560,.025,104],
 wall:['Vent des remparts','wind',920,.026,112],
 forest:['Forêt et feuillage','nature',1800,.034,160],
 lighthouse:['Vagues et phare','water',980,.043,155],
 terminal:['Voyageurs du relais','activity',800,.015,84],
 guardianCourt:['Résonance de la cour','resonance',330,.025,106],
});

const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
const stormy=new Set(['rain','heavy_rain','storm','snow']);
const rainy=new Set(['rain','heavy_rain','storm']);
const profilesCache=new Map();

/** Grounded in actual province, village, relay and Guardian coordinates. */
export function realmAcousticSources(region){
 if(!REALM_ACOUSTIC_BEDS[region])return [];
 if(profilesCache.has(region))return profilesCache.get(region);
 const sources=realmSites(region).map(site=>{
  const [name,kind,frequency,volume,radius]=REALM_SITE_ACOUSTICS[site.kind]||REALM_SITE_ACOUSTICS.terminal;
  return Object.freeze({id:'realm-sound:'+site.id,name,kind,region,site:site.id,x:site.x,z:site.z,frequency,volume,radius});
 });
 profilesCache.set(region,Object.freeze(sources));
 return profilesCache.get(region);
}

/** Pure, deterministic, no timers, no randomized mobile audio allocation. */
export function realmAmbientFrame(region,listener={x:0,z:0,heading:0},{interior=null,phase='day',weather='clear',limit=3}={}){
 const inside=!!interior,night=['night','evening'].includes(phase),dawn=phase==='dawn',wet=stormy.has(weather);
 const sources=realmAcousticSources(region).map(source=>{
  const spatial=spatialAudio(listener,source,source.radius),wild=['nature','wind'].includes(source.kind);
  const timeFactor=source.kind==='activity'||source.kind==='craft'?(night?.31:dawn?.68:1):source.kind==='nature'?(night?.22:dawn?.88:1):night&&source.kind==='resonance'?1.26:1;
  const weatherFactor=source.kind==='water'&&rainy.has(weather)?1.16:wild&&wet?.14:source.kind==='activity'&&wet?.45:source.kind==='craft'&&wet?.58:1;
  const indoorFactor=inside?(source.kind==='water'?.10:source.kind==='wind'?.05:.18):1;
  const gain=clamp(spatial.gain*source.volume*timeFactor*weatherFactor*indoorFactor,0,.065);
  return {...source,...spatial,gain};
 }).filter(source=>source.gain>.00045).sort((a,b)=>b.gain-a.gain||a.id.localeCompare(b.id)).slice(0,clamp(Math.floor(Number(limit)||0),0,3));
 return {sources,caption:sources[0]?.gain>.004?sources[0].name:null};
}

const rough=new Set(['alpine','mountain','fairychimney','windmill','kasbah','caravanserai','forest']);
const sand=new Set(['oasis','coastal','lighthouse','vineyard']);
/** Local surfaces share the same authored village positions as the scenery. */
export function realmFootstepSurface(region,position={x:0,z:0},{interior=false}={}){
 if(interior)return {id:'room-stone',frequency:530,pitch:110,volume:.036,duration:.067};
 const site=realmAcousticSources(region).map((source)=>{
  const distance=Math.hypot((Number(position.x)||0)-source.x,(Number(position.z)||0)-source.z);
  return {...source,distance};
 }).filter(source=>source.distance<source.radius*.68).sort((a,b)=>a.distance-b.distance)[0];
 const originalKind=site?realmSites(region).find(s=>s.id===site.site)?.kind:null;
 if(rough.has(originalKind))return{id:'realm-gravel',frequency:970,pitch:102,volume:.027,duration:.078};
 if(sand.has(originalKind))return{id:'realm-soft-earth',frequency:680,pitch:96,volume:.022,duration:.080};
 if(site)return{id:'realm-courtyard-stone',frequency:1460,pitch:125,volume:.031,duration:.060};
 return{id:'realm-trail',frequency:1150,pitch:112,volume:.025,duration:.071};
}
