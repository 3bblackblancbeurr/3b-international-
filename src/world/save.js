import {authClient,SUPABASE_URL,PUBLIC_KEY} from '../loyalty/client.js';
import {blankSave,normalizeSave,SAVE_VERSION} from './rules.js';
import {applyWorldAction} from './engine.js';
import {normalizeInvisibleState} from './invisible/progression.js';
import {INVISIBLE_EPISODE} from './invisible/catalog.js';
const queues=new Map(),key=id=>'3b_world_v1_'+(id||'guest'),journalBase=id=>'3b_world_actions_v2_'+id,journalKey=(id,device)=>journalBase(id)+'_'+device,ackKey=(id,device)=>'3b_world_ack_v2_'+id+'_'+device;
const episodeActions=new Set(['invisibleStart','invisibleAnswer','invisibleChest','invisiblePortal']);
// Journals created before the eight-realm campaign always refer to the Léman.
// New commands retain their episode even if another tab changes the selection.
function legacyEpisodeEntry(entry){return episodeActions.has(entry?.action?.type)&&!entry.action.episodeId?{...entry,action:{...entry.action,episodeId:INVISIBLE_EPISODE.id}}:entry;}
export function readLocal(id){try{const v=JSON.parse(localStorage.getItem(key(id)));return v?{...v,data:normalizeSave(v.data)}:null;}catch{return null;}}
function localMetadata(id){try{return JSON.parse(localStorage.getItem(key(id)));}catch{return null;}}
function redactInvisibleBackup(id,snapshot){
 const backupKey=key(id)+'_before_chapters';
 try{
  const backup=snapshot||JSON.parse(localStorage.getItem(backupKey));if(!backup)return;
  const invisible={...normalizeInvisibleState(backup.data?.invisible),memoryConsent:false,memory:[]};
  localStorage.setItem(backupKey,JSON.stringify({...backup,data:{...backup.data,invisible}}));
 }catch{try{localStorage.removeItem(backupKey);}catch{/* An unavailable device cannot retain a readable backup. */}}
}
export function writeLocal(id,data,dirty=true,lastSyncedAt){try{const previous=localMetadata(id);localStorage.setItem(key(id),JSON.stringify({data:normalizeSave(data),dirty,updatedAt:Date.now(),lastSyncedAt:lastSyncedAt??previous?.lastSyncedAt??null}));return true;}catch{return false;}}
function syncError(message,code){return Object.assign(Error(message),{code});}
function statusFor(id,state,outcome,extra={}){const local=localMetadata(id);return {scope:id?'account':'device',outcome,pendingCount:state?.pending.length||0,lastSyncedAt:local?.lastSyncedAt||null,hasLocalCopy:!!local?.data,...extra};}
export function worldSaveStatus(id){return statusFor(id,id?stateFor(id):null,id?'pending':'local');}
function stateFor(id){
 if(!queues.has(id)){let device,saved;try{device=sessionStorage.getItem('3b_world_tab_'+id);if(!device){device=crypto.randomUUID();sessionStorage.setItem('3b_world_tab_'+id,device);}saved=JSON.parse(localStorage.getItem(journalKey(id,device)));}catch{}
  queues.set(id,{device:device||crypto.randomUUID(),next:saved?.next||1,pending:Array.isArray(saved?.pending)?saved.pending.map(legacyEpisodeEntry):[],chain:Promise.resolve()});
 }return queues.get(id);
}
function persist(id,state){localStorage.setItem(journalKey(id,state.device),JSON.stringify({device:state.device,next:state.next,pending:state.pending}));}
export function recordWorldAction(id,save,action){
 const invisible=normalizeInvisibleState(save?.invisible);
 const command=action?.type==='invisibleMemoryConsent'&&action.enabled===true?{...action,expectedMemoryRevision:invisible.memoryRevision}:episodeActions.has(action?.type)&&!action.episodeId?{...action,episodeId:invisible.activeEpisode}:action;
 const next=applyWorldAction(save,command);
 if(action.type==='invisibleForget'||(action.type==='invisibleMemoryConsent'&&action.enabled===false))redactInvisibleBackup(id);
 if(id){const state=stateFor(id);if(state.pending.length>=5000)throw Error('Synchronise ton compte avant de poursuivre. Le journal hors ligne est plein.');
  const entry={seq:state.next,action:command};state.pending.push(entry);state.next++;
  try{persist(id,state);}catch{state.next--;state.pending.pop();throw Error('Le navigateur ne peut plus conserver le journal. Télécharge ta sauvegarde.');}
 }
 const stored=writeLocal(id,next);
 if(!id&&!stored)throw Error('Le stockage de cet appareil est plein ou indisponible. Libère de la place puis réessaie ; cette action n’a pas été enregistrée.');
 return next;
}
async function request(id,state,commands){
 const {data:{session}}=await authClient.auth.getSession();if(session?.user.id!==id)throw syncError('Reconnecte-toi pour synchroniser ton monde.','auth');
 let response;try{response=await fetch(SUPABASE_URL+'/functions/v1/world-engine',{method:'POST',headers:{apikey:PUBLIC_KEY,Authorization:'Bearer '+session.access_token,'Content-Type':'application/json'},body:JSON.stringify({device:state.device,commands}),signal:AbortSignal.timeout(20000)});}catch(error){throw syncError(error.name==='TimeoutError'||error.name==='AbortError'?'La connexion est trop lente. Réessaie quand le réseau revient.':'Synchronisation momentanément indisponible. Réessaie quand le réseau revient.','offline');}
 const result=await response.json().catch(()=>null);if(!response.ok)throw syncError(response.status===401||response.status===403?'Reconnecte-toi pour synchroniser ton monde.':result?.error||'Connexion momentanément indisponible.',response.status===401||response.status===403?'auth':'offline');
 // An HTTP success is not an acknowledgement. Keep the entire journal when
 // a proxy, interrupted response or stale service omits a valid receipt.
 if(!result||!Number.isSafeInteger(result.sequence)||result.sequence<0||result.sequence<(commands.at(-1)?.seq||0)||!result.data||typeof result.data!=='object'||Array.isArray(result.data)||result.data.version!==SAVE_VERSION||!Array.isArray(result.data.seals)||!result.data.adventure||typeof result.data.adventure!=='object'||Array.isArray(result.data.adventure))throw syncError('Réponse de sauvegarde incomplète. Ton journal est conservé ; réessaie la synchronisation.','receipt');
 return result;
}
function reconcile(id,state,result){
 const updated={...state,pending:state.pending.filter(e=>e.seq>result.sequence),next:Math.max(state.next,result.sequence+1)};let data=normalizeSave(result.data);
 for(const entry of updated.pending)try{data=applyWorldAction(data,entry.action);}catch{/* The server acknowledges and explains conflicting actions. */}
 // Commit the local snapshot before discarding its receipts. On quota failure
 // the old queue remains retryable; the server deduplicates acknowledged input.
 if(!writeLocal(id,data,!!updated.pending.length,Date.now()))throw syncError('Le compte a répondu mais la copie locale ne peut pas être enregistrée. Le journal est conservé.','storage');
 persist(id,updated);state.pending=updated.pending;state.next=updated.next;return data;
}
async function recoverOtherJournals(id,current){
 // Each tab has its own sequence. Read abandoned journals without rewriting a
 // different tab's queue; server receipts make concurrent recovery idempotent.
 const journals=[];for(let i=0;i<localStorage.length;i++){const name=localStorage.key(i);if(!name?.startsWith(journalBase(id))||name===journalKey(id,current.device))continue;try{const j=JSON.parse(localStorage.getItem(name));if(j?.device&&Array.isArray(j.pending))journals.push(j);}catch{}}
 for(const j of journals){let acknowledged=Number(localStorage.getItem(ackKey(id,j.device)))||0;const pending=j.pending.filter(e=>e.seq>acknowledged).map(legacyEpisodeEntry);
  for(let i=0;i<pending.length;i+=100){const result=await request(id,j,pending.slice(i,i+100));acknowledged=Math.max(acknowledged,result.sequence);localStorage.setItem(ackKey(id,j.device),String(acknowledged));}
 }
}
export async function loadWorld(id){
 const local=readLocal(id);if(!id)return{data:local?.data||blankSave(),status:statusFor(id,null,local?'local':'new'),message:local?'Partie invitée retrouvée sur cet appareil.':'Sauvegarde automatique sur cet appareil.'};
 const state=stateFor(id);
 const operation=async()=>{try{
  try{if(local&&!localStorage.getItem(key(id)+'_before_chapters'))redactInvisibleBackup(id,local);else redactInvisibleBackup(id);}catch{/* An optional migration copy must not block account recovery. */}
  await recoverOtherJournals(id,state);
  const result=await request(id,state,state.pending.slice(0,100)),data=reconcile(id,state,result);
  return{data,needsSave:!!state.pending.length,status:statusFor(id,state,state.pending.length?'pending':'synced'),message:result.rejected?.length?'Compte synchronisé · '+result.rejected[0].message:'Monde lié à ton compte · actions validées par le serveur.'};
 }catch(error){return{data:readLocal(id)?.data||local?.data||blankSave(),needsSave:!!state.pending.length,status:statusFor(id,state,error.code||'offline'),message:'Copie locale · '+error.message};}};
 state.chain=state.chain.then(operation,operation);return state.chain;
}
export function saveWorld(id,data){
 if(!id){const stored=writeLocal(id,data,false);return Promise.resolve({pending:!stored,status:statusFor(id,null,stored?'local':'storage'),message:stored?'Sauvegardé sur cet appareil.':'Télécharge une copie : le stockage local est plein.'});}
 const state=stateFor(id);
 const operation=async()=>{
  try{
   // A fight produces ten commands a second. Drain the journal that existed
   // when this sync began, without chasing newly arriving commands forever.
   const through=state.pending.at(-1)?.seq||0;let result,next,rejection;
   do{result=await request(id,state,state.pending.filter(e=>e.seq<=through).slice(0,100));next=reconcile(id,state,result);rejection ||= result.rejected?.[0]?.message;}while(state.pending.some(e=>e.seq<=through));
   return{data:next,pending:!!state.pending.length,status:statusFor(id,state,state.pending.length?'pending':'synced'),message:rejection?'Compte synchronisé · '+rejection:state.pending.length?'Synchronisation du journal en cours…':'Sauvegardé sur ton compte · gains et compagnons validés.'};
  }
  catch(error){return{pending:true,status:statusFor(id,state,error.code||'storage'),message:'Copie locale gardée · '+error.message};}
 };
 state.chain=state.chain.then(operation,operation);return state.chain;
}
