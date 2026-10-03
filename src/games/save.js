import {readMatchSnapshot} from './dada3b/engine.js';
import {readDoorCampaign} from './door-campaign.js';
import {readMazeCampaign} from './maze-campaign.js';
import {validatePowerSnapshot} from './power3b/state.js';
const URL='https://ttvhcezucsbbmnafrotq.supabase.co/rest/v1/arcade_saves';
const KEY='sb_publishable_MQUCR8oNdpEgeO2iMKnLQw_wj5XdNC4';
const CACHE='3b_arcade_cache_v1',IDENTITY='3b_arcade_identity_v1';
export const freshProgress=()=>({version:1,records:{},tower:null,maze:null,dada3b:null,power3b:null,refuge:null,cities:null});
const plain=v=>v&&typeof v==='object'&&!Array.isArray(v);
export function validateProgress(value){
 if(!plain(value)||value.version!==1||!plain(value.records))throw Error('Ce fichier n’est pas une sauvegarde Jeux 3B valide.');
 if(JSON.stringify(value).length>160000)throw Error('La sauvegarde est trop volumineuse.');
 const result=freshProgress();if(value.tower)result.tower=readDoorCampaign(value.tower);if(value.maze)result.maze=readMazeCampaign(value.maze);if(value.dada3b){const d=readMatchSnapshot(value.dada3b);if(!d)throw Error('Sauvegarde DADA 3B invalide.');result.dada3b=d;}if(value.power3b)result.power3b=validatePowerSnapshot(value.power3b);
 for(const id of ['arena','tower','maze','dada3b','power3b','refuge','cities'])if(plain(value.records[id])){const r=value.records[id];result.records[id]={best:Number.isFinite(r.best)?Math.max(0,Math.min(1e8,Math.round(r.best))):0,plays:Number.isSafeInteger(r.plays)?Math.max(0,Math.min(1e6,r.plays)):0,wins:Number.isSafeInteger(r.wins)?Math.max(0,Math.min(1e6,r.wins)):0,guardians:Number.isSafeInteger(r.guardians)?Math.max(0,Math.min(8,r.guardians)):0,floor:Number.isSafeInteger(r.floor)?Math.max(0,Math.min(100,r.floor)):0};}
 if(value.refuge){const r=value.refuge;if(!plain(r)||!['day','night'].includes(r.phase)||!plain(r.player)||!Array.isArray(r.nodes)||r.nodes.length!==4||!Array.isArray(r.enemies)||r.enemies.length>65||!Array.isArray(r.rescued)||r.rescued.length>200)throw Error('Sauvegarde du refuge invalide.');for(const k of ['day','phaseTime','wood','gate','turrets','homes','people','score','time'])if(!Number.isFinite(r[k])||r[k]<0||r[k]>1e8)throw Error('Données du refuge invalides.');if(r.day<1||r.turrets>4||r.homes<1||r.homes>6||r.gate>100||r.phaseTime>151||!Number.isFinite(r.player.x)||!Number.isFinite(r.player.y)||!Number.isFinite(r.player.hp))throw Error('Données du refuge invalides.');for(const n of [...r.nodes,...r.enemies,...(r.resident?[r.resident]:[])])if(!plain(n)||!Number.isFinite(n.x)||!Number.isFinite(n.y))throw Error('Position du refuge invalide.');for(const n of r.nodes)if(!Number.isFinite(n.amount)||n.amount<0||n.amount>35)throw Error('Matériaux invalides.');for(const e of r.enemies)for(const k of ['hp','speed','type','hit'])if(!Number.isFinite(e[k]))throw Error('Ennemi invalide.');result.refuge=Object.fromEntries(['day','phase','phaseTime','wood','gate','turrets','homes','people','rescued','nodes','score','player','resident','enemies','time'].map(k=>[k,structuredClone(r[k])]));}
 if(value.cities){const c=value.cities;if(!plain(c)||!plain(c.world)||!Array.isArray(c.completed)||!Number.isInteger(c.countryIndex)||c.countryIndex<0||c.countryIndex>7||c.completed.some(i=>!Number.isInteger(i)||i<0||i>7))throw Error('Sauvegarde des villes invalide.');for(const [index,city]of Object.entries(c.world)){if(!/^[0-7]$/.test(index))throw Error('Pays invalide.');if(!city)continue;if(!Array.isArray(city.board)||city.board.length!==49||!Array.isArray(city.hand)||city.hand.length!==4||!Number.isFinite(city.turn)||!Number.isFinite(city.score))throw Error('Ville invalide.');for(const t of [...city.board,...city.hand])if(t&&(!['road','house','garden','monument'].includes(t.type)||!Number.isInteger(t.rot)||t.rot<0||t.rot>3||(t.type==='road'&&!['corner','straight','junction','crossroads'].includes(t.shape))))throw Error('Tuile invalide.');}result.cities=structuredClone(c);}
 return result;
}

const sameValue=(left,right)=>JSON.stringify(left)===JSON.stringify(right);
const clone=value=>value==null?null:structuredClone(value);
const recordDefaults=()=>({best:0,plays:0,wins:0,guardians:0,floor:0});
const bounded=(value,max)=>Math.max(0,Math.min(max,Math.round(Number(value)||0)));

function mergeBranch(base,local,remote){
 if(sameValue(local,remote))return clone(local);
 if(base!==null&&sameValue(local,base))return clone(remote);
 if(base!==null&&sameValue(remote,base))return clone(local);
 // A live checkpoint from this device wins only when both devices changed the
 // same in-progress run. Permanent records are merged separately below.
 return clone(local??remote);
}

function mergeCampaign(base,local,remote,kind){
 const selected=mergeBranch(base,local,remote);
 if((base!==null&&(sameValue(local,base)||sameValue(remote,base)))||sameValue(local,remote))return selected;
 if(!local)return clone(remote);if(!remote)return clone(local);
 const completedLength=Math.max(local.completed?.length||0,remote.completed?.length||0);
 const completed=Array.from({length:completedLength},(_,index)=>index+1),best={};
 for(const level of completed){
  const left=local.best?.[level],right=remote.best?.[level];
  if(!left){best[level]=clone(right);continue;}if(!right){best[level]=clone(left);continue;}
  best[level]={stars:Math.max(left.stars,right.stars),score:Math.max(left.score,right.score),time:Math.min(left.time,right.time)};
 }
 const campaign={version:1,selected:Math.max(1,Math.min(100,completedLength+1,Math.max(local.selected||1,remote.selected||1))),completed,best};
 if(kind==='tower'){
  // Concurrent runs cannot be combined safely. Keeping the permanent campaign
  // and dropping only the volatile room checkpoint prevents an invalid save.
  campaign.run=null;
  if(Object.hasOwn(local,'originsRun')||Object.hasOwn(remote,'originsRun'))campaign.originsRun=null;
 }
 return campaign;
}

function mergeCities(base,local,remote){
 const selected=mergeBranch(base,local,remote);
 if((base!==null&&(sameValue(local,base)||sameValue(remote,base)))||sameValue(local,remote))return selected;
 if(!local)return clone(remote);if(!remote)return clone(local);
 const world={},countries=new Set([...Object.keys(local.world||{}),...Object.keys(remote.world||{})]);
 for(const country of countries)world[country]=mergeBranch(base?.world?.[country]??null,local.world?.[country]??null,remote.world?.[country]??null);
 return{
  world,
  countryIndex:local.countryIndex,
  completed:[...new Set([...(local.completed||[]),...(remote.completed||[])])].sort((a,b)=>a-b)
 };
}

function mergeRecords(base,local,remote){
 const result={},ids=new Set([...Object.keys(local||{}),...Object.keys(remote||{})]);
 for(const id of ids){
  const b=base?.[id]||recordDefaults(),l=local?.[id]||recordDefaults(),r=remote?.[id]||recordDefaults();
  const additive=(key,max)=>base===null?Math.max(l[key],r[key]):Math.max(l[key],r[key],r[key]+Math.max(0,l[key]-b[key]));
  result[id]={
   best:bounded(Math.max(l.best,r.best),1e8),
   plays:bounded(additive('plays',1e6),1e6),
   wins:bounded(additive('wins',1e6),1e6),
   guardians:bounded(Math.max(l.guardians,r.guardians),8),
   floor:bounded(Math.max(l.floor,r.floor),100)
  };
 }
 return result;
}

/**
 * Rebase a local Jeux 3B checkpoint onto a newer server checkpoint.
 * `base === null` means the device never observed the server version; in that
 * case additive counters use the conservative maximum instead of double-counting.
 */
export function mergeGameProgress(base,local,remote){
 const cleanBase=base===null?null:validateProgress(base),cleanLocal=validateProgress(local),cleanRemote=validateProgress(remote);
 if(sameValue(cleanLocal,cleanRemote))return cleanLocal;
 const result=freshProgress();
 result.records=mergeRecords(cleanBase?.records??null,cleanLocal.records,cleanRemote.records);
 result.tower=mergeCampaign(cleanBase?.tower??null,cleanLocal.tower,cleanRemote.tower,'tower');
 result.maze=mergeCampaign(cleanBase?.maze??null,cleanLocal.maze,cleanRemote.maze,'maze');
 for(const key of ['dada3b','power3b','refuge'])result[key]=mergeBranch(cleanBase?.[key]??null,cleanLocal[key],cleanRemote[key]);
 result.cities=mergeCities(cleanBase?.cities??null,cleanLocal.cities,cleanRemote.cities);
 return validateProgress(result);
}
function identity(){let token;try{token=localStorage.getItem(IDENTITY);}catch{}if(!/^[a-f0-9]{64}$/.test(token||'')){token=Array.from(crypto.getRandomValues(new Uint8Array(32)),v=>v.toString(16).padStart(2,'0')).join('');try{localStorage.setItem(IDENTITY,token);}catch{}}return token;}
const token=identity();let playerKey,chain=Promise.resolve(),remoteKnown=false,saveRevision=0;
const hash=async()=>playerKey??=(Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token))),v=>v.toString(16).padStart(2,'0')).join(''));
const headers=()=>({apikey:KEY,'Content-Type':'application/json','x-game-token':token});
function readCache(){try{const c=JSON.parse(localStorage.getItem(CACHE));return c?{...c,data:validateProgress(c.data)}:null;}catch{return null;}}
function cache(data,dirty){try{localStorage.setItem(CACHE,JSON.stringify({data,dirty}));return true;}catch{return false;}}
async function remote(){const key=await hash();const res=await fetch(URL+'?player_key=eq.'+key+'&select=data',{headers:headers(),signal:AbortSignal.timeout(7000)});if(!res.ok)throw Error('Sauvegarde en ligne temporairement indisponible.');const rows=await res.json();remoteKnown=true;return rows[0]?.data?validateProgress(rows[0].data):freshProgress();}
export async function loadProgress(){const local=readCache();try{const data=await remote();if(local?.dirty)return{data:local.data,message:'Progression récupérée. Synchronisation en cours…',online:true};cache(data,false);return{data,message:'Progression sauvegardée automatiquement, sans compte.',online:true};}catch(error){console.warn('3B save load:',error.message);return{data:local?.data||freshProgress(),message:'Hors ligne : progression conservée sur cet appareil. Exporte une copie pour la protéger.',online:false};}}
export function saveProgress(data){const snapshot=validateProgress(data),revision=++saveRevision;const cached=cache(snapshot,true);const operation=async()=>{try{if(!remoteKnown)await remote();const res=await fetch(URL,{method:'POST',headers:{...headers(),Prefer:'resolution=merge-duplicates'},body:JSON.stringify({player_key:await hash(),data:snapshot,updated_at:new Date().toISOString()}),signal:AbortSignal.timeout(7000)});if(!res.ok)throw Error('save');if(revision===saveRevision)cache(snapshot,false);return'Sauvegardé en ligne.';}catch{return cached?'Sauvegardé sur cet appareil · en attente de connexion.':'Sauvegarde indisponible · exporte une copie avant de quitter.';}};chain=chain.then(operation,operation);return chain;}
export function recordGame(progress,id,g){const next=structuredClone(progress),old=next.records[id]||{best:0,plays:0,wins:0,guardians:0,floor:0};next.records[id]={...old,best:Math.max(old.best,g.score||0),plays:old.plays+1,wins:old.wins+(g.won?1:0),guardians:Math.max(old.guardians,g.guardians||0),floor:Math.max(old.floor,g.floor||0)};if(g.snapshot)next[id]=g.snapshot();return next;}
