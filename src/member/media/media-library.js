export const MEDIA_LIBRARY_KEY='threeb_media_library_v1';
export const MEDIA_BACKUP_MAX_BYTES=1000000;
export const NARRATION_IDS=Object.freeze(['prologue',...['france','algerie','maroc','tunisie','espagne','italie','turquie','estonie'].map(id=>'entry-'+id)]);
export const MEDIA_STATUSES=Object.freeze({planned:'À découvrir',watching:'En cours',watched:'Terminé'});
const clean=(value,max)=>typeof value==='string'?value.replace(/[\u0000-\u001f\u007f]/g,' ').trim().slice(0,max):'';
const fresh=()=>({version:1,entries:[],savedNarrations:[],positions:{}});
// Enumerable symbols survive object spreads while JSON exports omit them.
// Each loaded state owns its baseline; two browser tabs never share one.
const BASELINE=Symbol('3b-media-library-baseline');
const withBaseline=(state,baseline)=>Object.assign(state,{[BASELINE]:baseline});
const snapshot=state=>({version:1,entries:state.entries.map(entry=>({...entry})),savedNarrations:[...state.savedNarrations],positions:Object.fromEntries(Object.entries(state.positions).map(([id,position])=>[id,{...position}]))});
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
export const mediaBackupByteLength=source=>new TextEncoder().encode(source).byteLength;
export function normalizeMediaLibrary(raw){
 const next=fresh();if(!raw||raw.version!==1)return withBaseline(next,fresh());
 next.savedNarrations=[...new Set(Array.isArray(raw.savedNarrations)?raw.savedNarrations:[])].filter(id=>NARRATION_IDS.includes(id));
 for(const id of NARRATION_IDS){const position=raw.positions?.[id];if(position&&Number.isFinite(position.seconds)&&Number.isFinite(position.duration)&&position.duration>0&&position.duration<=120){next.positions[id]={seconds:Math.max(0,Math.min(position.seconds,position.duration)),duration:position.duration,finished:position.finished===true};}}
 const seen=new Set();
 for(const row of (Array.isArray(raw.entries)?raw.entries:[]).slice(0,150)){
  const id=clean(row?.id,100),title=clean(row?.title,100);
  if(!/^[-a-zA-Z0-9_]{1,100}$/.test(id)||!title||seen.has(id))continue;
  seen.add(id);next.entries.push({id,title,creator:clean(row.creator,100),kind:row.kind==='series'?'series':'film',status:Object.hasOwn(MEDIA_STATUSES,row.status)?row.status:'planned',notes:clean(row.notes,1000)});
 }
 return withBaseline(next,raw[BASELINE]||fresh());
}
function strictLibrary(raw){
 if(!raw||raw.version!==1||!Array.isArray(raw.entries)||raw.entries.length>150)throw Error('Bibliothèque invalide.');
 const normalized=normalizeMediaLibrary(raw);
 if(normalized.entries.length!==raw.entries.length||raw.entries.some(entry=>entry.status!==undefined&&!Object.hasOwn(MEDIA_STATUSES,entry.status)))throw Error('Titres invalides ou en double.');
 if(raw.savedNarrations!==undefined&&(!Array.isArray(raw.savedNarrations)||raw.savedNarrations.some(id=>!NARRATION_IDS.includes(id))))throw Error('Récits enregistrés invalides.');
 if(raw.positions!==undefined&&(!raw.positions||typeof raw.positions!=='object'||Array.isArray(raw.positions)||Object.entries(raw.positions).some(([id,position])=>!NARRATION_IDS.includes(id)||!position||!Number.isFinite(position.seconds)||!Number.isFinite(position.duration)||position.duration<=0||position.duration>120)))throw Error('Positions audio invalides.');
 return normalized;
}
export function loadMediaLibrary(storage){
 try{const source=(storage??globalThis.localStorage).getItem(MEDIA_LIBRARY_KEY),state=source?strictLibrary(JSON.parse(source)):normalizeMediaLibrary(null);return {state:withBaseline(state,snapshot(state)),warning:''};}
 catch{return {state:normalizeMediaLibrary(null),warning:'Le stockage est indisponible ou illisible. Son contenu est conservé ; exporte tes nouveaux choix avant de quitter.'};}
}

function mergeConcurrentMedia(base,local,remote){
 const entries=new Map(remote.entries.map(entry=>[entry.id,{...entry}])),baseEntries=new Map(base.entries.map(entry=>[entry.id,entry])),localEntries=new Map(local.entries.map(entry=>[entry.id,entry]));
 const conflicts=[],fields=['title','creator','kind','status','notes'];
 for(const [id,previous] of baseEntries){
  const desired=localEntries.get(id),latest=entries.get(id);
  if(!desired){if(latest&&!same(previous,latest))conflicts.push(id);else entries.delete(id);continue;}
  const changes=fields.filter(field=>desired[field]!==previous[field]);
  if(!changes.length)continue;
  if(!latest){conflicts.push(id);continue;}
  if(changes.some(field=>latest[field]!==previous[field]&&latest[field]!==desired[field])){conflicts.push(id);continue;}
  entries.set(id,{...latest,...Object.fromEntries(changes.map(field=>[field,desired[field]]))});
 }
 for(const desired of local.entries){if(baseEntries.has(desired.id))continue;const latest=entries.get(desired.id);if(latest&&!same(latest,desired))conflicts.push(desired.id);else entries.set(desired.id,{...desired});}
 if(conflicts.length)return {conflicts};
 if(entries.size>150)throw Error('Les ajouts des autres onglets dépasseraient la limite de 150 titres. Exporte tes nouveaux choix.');
 const order=[...local.entries.filter(entry=>!baseEntries.has(entry.id)).map(entry=>entry.id),...remote.entries.map(entry=>entry.id)],ordered=[...new Set(order)].filter(id=>entries.has(id)).map(id=>entries.get(id));
 const saved=new Set(remote.savedNarrations);
 for(const id of NARRATION_IDS){const old=base.savedNarrations.includes(id),desired=local.savedNarrations.includes(id);if(old!==desired){if(desired)saved.add(id);else saved.delete(id);}}
 const positions={...remote.positions};
 for(const id of NARRATION_IDS){const previous=base.positions[id],desired=local.positions[id],latest=remote.positions[id];if(same(previous,desired))continue;if(!desired){if(same(previous,latest))delete positions[id];continue;}if(!latest||same(previous,latest))positions[id]={...desired};else{const duration=Math.max(desired.duration,latest.duration);positions[id]={duration,seconds:Math.min(duration,Math.max(desired.seconds,latest.seconds)),finished:desired.finished||latest.finished};}}
 return {state:normalizeMediaLibrary({version:1,entries:ordered,savedNarrations:[...saved],positions}),conflicts:[]};
}

export function saveMediaLibraryDetailed(state,storage){
 let local;try{local=strictLibrary(state);}catch{return {ok:false,state,warning:'La bibliothèque contient des données invalides. La sauvegarde existante est conservée.'};}
 try{
  const target=storage??globalThis.localStorage,source=target.getItem(MEDIA_LIBRARY_KEY);let remote;
  try{remote=source?strictLibrary(JSON.parse(source)):normalizeMediaLibrary(null);}catch{return {ok:false,state:local,warning:'La sauvegarde existante est illisible ou incompatible. Elle n’a pas été écrasée. Exporte tes nouveaux choix avant toute récupération.'};}
  const merged=mergeConcurrentMedia(state[BASELINE]||fresh(),local,remote);
  if(merged.conflicts.length)return {ok:false,state:local,conflicts:merged.conflicts,warning:'Un autre onglet a modifié ou retiré le même titre. Aucun changement enregistré n’a été écrasé. Exporte ta version avant de recharger pour comparer.'};
  target.setItem(MEDIA_LIBRARY_KEY,JSON.stringify(merged.state));
  // Legacy boolean callers may retain their local view: unknown remote titles
  // must never become implicit deletions in their next save.
  try{state[BASELINE]=snapshot(local);}catch{/* A frozen caller still receives a complete result state. */}
  return {ok:true,state:withBaseline(merged.state,snapshot(merged.state)),warning:''};
 }catch(error){return {ok:false,state:local,warning:error?.message?.includes('150 titres')?error.message:'Sauvegarde locale impossible : tes choix restent dans cette visite. Exporte-les pour les conserver.'};}
}
export function saveMediaLibrary(state,storage){return saveMediaLibraryDetailed(state,storage).ok;}
export async function persistMediaLibrary(state,storage,locks=globalThis.navigator?.locks){
 if(locks?.request)return locks.request(MEDIA_LIBRARY_KEY,()=>saveMediaLibraryDetailed(state,storage));
 return saveMediaLibraryDetailed(state,storage);
}

export function createMediaLibrarySession({storage,locks=globalThis.navigator?.locks}={}){
 const loaded=loadMediaLibrary(storage);let current=loaded.state,committed=snapshot(loaded.state),revision=0,queue=Promise.resolve(),pending=[];
 return {loaded,getState:()=>current,isCurrent:value=>value===revision,commit(change){
  const previous=snapshot(current);
  const next=typeof change==='function'?change(current):change;
  current=withBaseline(strictLibrary(next),previous);const ticket=++revision,captured=current;
  pending.push({revision:ticket,before:previous,after:snapshot(current)});
  const persistence=queue.catch(()=>{}).then(async()=>{
   // Failed writes remain pending. Reapply their field deltas against the last
   // successful view, rather than treating unsaved edits as a persisted base.
   // Functions are not replayed: an added title keeps its original UUID.
   let candidate=normalizeMediaLibrary(committed);
   for(const delta of pending.filter(item=>item.revision<=ticket)){
    const applied=mergeConcurrentMedia(delta.before,delta.after,candidate);
    if(applied.conflicts.length)return {ok:false,state:captured,conflicts:applied.conflicts,warning:'Un autre onglet a modifié le même titre. Tes changements non enregistrés sont conservés dans cette visite ; exporte-les avant de recharger.'};
    candidate=applied.state;
   }
   candidate=withBaseline(candidate,snapshot(committed));
   const result=await persistMediaLibrary(candidate,storage,locks);
   if(result.ok){committed=snapshot(result.state);pending=pending.filter(item=>item.revision>ticket);}
   return result;
  }).catch(()=>({ok:false,state:captured,warning:'La sauvegarde locale n’a pas pu être terminée. Exporte tes choix avant de quitter.'})).then(result=>{if(ticket===revision)current=result.state;return {...result,revision:ticket};});
  queue=persistence;return {state:current,revision:ticket,persistence};
 }};
}
export function addWatchEntry(state,draft,id=globalThis.crypto?.randomUUID?.()){
 const title=clean(draft?.title,100);if(!title)throw Error('Indique le titre de ton film ou de ta série.');
 if(state.entries.length>=150)throw Error('Ta liste contient déjà 150 titres. Exporte-la avant de la réorganiser.');
 if(typeof id!=='string'||!/^[-a-zA-Z0-9_]{1,100}$/.test(id))throw Error('Identifiant indisponible. Réessaie.');
 if(state.entries.some(entry=>entry.id===id))throw Error('Ce titre est déjà enregistré.');
 return normalizeMediaLibrary({...state,entries:[{...draft,id,title,status:'planned'},...state.entries]});
}
export function updateWatchEntry(state,id,patch){
 if(!state.entries.some(entry=>entry.id===id))throw Error('Titre introuvable.');
 if(!patch||typeof patch!=='object')throw Error('Modification invalide.');
 if(patch.title!==undefined&&!clean(patch.title,100))throw Error('Indique le titre de ton film ou de ta série.');
 if(patch.status!==undefined&&!Object.hasOwn(MEDIA_STATUSES,patch.status))throw Error('État de lecture inconnu.');
 if(patch.kind!==undefined&&!['film','series'].includes(patch.kind))throw Error('Format inconnu.');
 const allowed=Object.fromEntries(['title','creator','kind','status','notes'].filter(field=>Object.hasOwn(patch,field)&&patch[field]!==undefined).map(field=>[field,patch[field]]));
 return normalizeMediaLibrary({...state,entries:state.entries.map(entry=>entry.id===id?{...entry,...allowed,id}:entry)});
}
export function toggleSavedNarration(state,id){if(!NARRATION_IDS.includes(id))throw Error('Récit inconnu.');return {...state,savedNarrations:state.savedNarrations.includes(id)?state.savedNarrations.filter(value=>value!==id):[...state.savedNarrations,id]};}
export function rememberNarration(state,id,seconds,duration,finished=false){
 if(!NARRATION_IDS.includes(id)||!Number.isFinite(seconds)||!Number.isFinite(duration)||duration<=0||duration>120)throw Error('Position audio invalide.');
 return normalizeMediaLibrary({...state,positions:{...state.positions,[id]:{seconds:Math.max(0,Math.min(seconds,duration)),duration,finished:finished===true||state.positions[id]?.finished===true}}});
}
export function findWatchEntries(state,{query='',status='all'}={}){const words=clean(query,100).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().split(/\s+/).filter(Boolean);return state.entries.filter(entry=>(status==='all'||entry.status===status)&&words.every(word=>[entry.title,entry.creator,entry.notes].join(' ').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().includes(word)));}
export function exportMediaLibrary(state){return JSON.stringify({format:'3b-media-library',...normalizeMediaLibrary(state)},null,2);}
export function mergeMediaLibrary(state,source){
 if(typeof source!=='string'||mediaBackupByteLength(source)>MEDIA_BACKUP_MAX_BYTES)throw Error('Choisis un fichier JSON de moins de 1 Mo.');
 let raw;try{raw=JSON.parse(source);}catch{throw Error('Fichier JSON illisible.');}
 if(raw?.format!=='3b-media-library'||raw.version!==1||!Array.isArray(raw.entries)||raw.entries.length>150)throw Error('Ce fichier n’est pas une sauvegarde de la médiathèque 3B.');
 let incoming;try{incoming=strictLibrary(raw);}catch{throw Error('La sauvegarde contient des titres, récits ou positions invalides ou en double.');}
 const entries=[...state.entries,...incoming.entries.filter(item=>!state.entries.some(old=>old.id===item.id))];if(entries.length>150)throw Error('La fusion dépasserait 150 titres.');
 return normalizeMediaLibrary({...state,entries,savedNarrations:[...state.savedNarrations,...incoming.savedNarrations],positions:{...incoming.positions,...state.positions}});
}
