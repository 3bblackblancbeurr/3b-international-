import {memberRequest} from '../loyalty/client.js';
import {freshProgress,loadProgress,mergeGameProgress,saveProgress,validateProgress} from './save.js';

const CACHE_VERSION=2;
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const same=(left,right)=>JSON.stringify(left)===JSON.stringify(right);
const copy=value=>structuredClone(value);
const keyFor=id=>'3b_arcade_account_'+id;

function serverState(payload){
 const save=payload?.save;
 if(!save)return{exists:false,data:freshProgress(),revision:0,updatedAt:null};
 const revision=Number(save.revision);
 if(!Number.isSafeInteger(revision)||revision<0)throw Error('Révision de sauvegarde invalide.');
 return{exists:true,data:validateProgress(save.data),revision,updatedAt:save.updatedAt||save.updated_at||null};
}

function syncState(payload){
 const revision=Number(payload?.revision);
 if(!Number.isSafeInteger(revision)||revision<0||typeof payload?.conflict!=='boolean')throw Error('Réponse de sauvegarde invalide.');
 return{
  conflict:payload.conflict,
  idempotent:payload.idempotent===true,
  exists:payload.data!=null,
  data:payload.data==null?freshProgress():validateProgress(payload.data),
  revision,
  updatedAt:payload.updated_at||payload.updatedAt||null
 };
}

export function createMemberSaveStore({
 request=(action,body,id)=>memberRequest(action,body,id),
 getStorage=()=>globalThis.localStorage,
 guestLoad=loadProgress,
 guestSave=saveProgress,
 createOperationId=()=>globalThis.crypto.randomUUID()
}={}){
 const states=new Map();
 const stateFor=id=>{
  if(!states.has(id))states.set(id,{chain:Promise.resolve(),sequence:0,known:false,exists:false,serverRevision:0,base:freshProgress(),pending:null,latest:null});
  return states.get(id);
 };
 const readCache=id=>{
  try{
   const raw=JSON.parse(getStorage()?.getItem(keyFor(id))||'null');
   if(!raw)return null;
   const data=validateProgress(raw.data),base=raw.baseKnown&&raw.base?validateProgress(raw.base):null;
   let pending=null;
   if(raw.pending&&UUID.test(raw.pending.operationId||'')&&Number.isSafeInteger(raw.pending.baseRevision)&&raw.pending.baseRevision>=0){
    pending={operationId:raw.pending.operationId,baseRevision:raw.pending.baseRevision,data:validateProgress(raw.pending.data),localData:raw.pending.localData?validateProgress(raw.pending.localData):null,base:raw.pending.base?validateProgress(raw.pending.base):null};
   }
   return{data,dirty:raw.dirty===true,baseKnown:raw.baseKnown===true&&!!base,base,serverRevision:Number.isSafeInteger(raw.serverRevision)&&raw.serverRevision>=0?raw.serverRevision:0,pending};
  }catch{return null;}
 };
 const persist=(id,data,dirty,state)=>{
  try{
   const storage=getStorage();if(!storage)return false;
   storage.setItem(keyFor(id),JSON.stringify({
    version:CACHE_VERSION,data:validateProgress(data),dirty:dirty===true,
    baseKnown:state.known,base:state.known?state.base:null,serverRevision:state.serverRevision,
    pending:state.pending
   }));
   return true;
  }catch{return false;}
 };
 const hydrate=async(id,state)=>{
  const remote=serverState(await request('game-save-load',{},id));
  state.known=true;state.exists=remote.exists;state.serverRevision=remote.revision;state.base=remote.data;
  return remote;
 };
 const flushPending=async(id,state,desired)=>{
  for(let attempt=0;attempt<4&&state.pending;attempt++){
    const pending=state.pending;
   persist(id,desired,true,state);
   const result=syncState(await request('game-save-sync',{
    baseRevision:pending.baseRevision,
    operationId:pending.operationId,
    data:pending.data
   },id));
   state.known=true;state.exists=result.exists;state.serverRevision=result.revision;state.base=result.data;
   if(!result.conflict){state.pending=null;return result;}
   const rebased=mergeGameProgress(pending.base,pending.data,result.data);
   state.pending={...pending,operationId:createOperationId(),baseRevision:result.revision,data:rebased,base:result.data};
  }
  if(state.pending)throw Error('La sauvegarde change sur un autre appareil. Réessaie.');
  return null;
 };

 async function load(user){
  if(!user?.id)return guestLoad();
  const id=user.id,state=stateFor(id),local=readCache(id);
  if(local?.pending)state.pending=local.pending;
  try{
   let remote,pendingBase=null;
   if(state.pending){
    pendingBase=state.pending.localData||state.pending.data;
    const recovered=await flushPending(id,state,local?.data||state.pending.data);
    remote={exists:state.exists,data:recovered?.data||state.base,revision:state.serverRevision,updatedAt:recovered?.updatedAt||null};
   }else remote=await hydrate(id,state);

   let data=remote.data,dirty=false;
   if(local?.dirty){
    const base=pendingBase||(local.baseKnown?local.base:null);
    data=mergeGameProgress(base,local.data,remote.data);
    dirty=!same(data,remote.data);
   }else if(!remote.exists){
    const guest=local?.data||(await guestLoad()).data;
    data=validateProgress(guest);dirty=!same(data,remote.data);
   }
   state.latest={ticket:state.sequence,data,base:remote.data,baseKnown:true};
   persist(id,data,dirty,state);
   return{
    data,
    message:dirty?'Progression récupérée · synchronisation sécurisée en cours.':'Progression liée à ton compte 3B.',
    online:true
   };
  }catch(error){
   const data=local?.data||freshProgress();
   return{data,message:'Hors ligne : sauvegarde de ce compte conservée sur cet appareil.',online:false,error:error?.message||''};
  }
 }

 function save(data,user,onReconcile){
  if(!user?.id)return Promise.resolve(guestSave(data));
  const id=user.id,state=stateFor(id),snapshot=validateProgress(data),ticket=++state.sequence;
  state.latest={ticket,data:snapshot,base:state.known?copy(state.base):null,baseKnown:state.known};
  persist(id,snapshot,true,state);
  const operation=async()=>{
   try{
    // Intermediate checkpoints are coalesced. The last queued checkpoint still
    // carries every validated game snapshot and all cumulative record counters.
    if(ticket!==state.latest?.ticket)return'Synchronisation du dernier point de reprise…';
    if(!state.known)await hydrate(id,state);
    if(state.pending){
     const recovery=state.pending;
     const recovered=await flushPending(id,state,state.latest.data);
     const newer=mergeGameProgress(recovery.localData||recovery.data,state.latest.data,recovered.data);
     state.latest={...state.latest,data:newer,base:copy(recovered.data),baseKnown:true};
    }
    if(ticket!==state.latest?.ticket)return'Synchronisation du dernier point de reprise…';

    const latest=state.latest;
    const candidate=mergeGameProgress(latest.baseKnown?latest.base:null,latest.data,state.base);
    if(state.exists&&same(candidate,state.base)){
     persist(id,state.base,false,state);onReconcile?.(copy(state.base));
     return'Sauvegardé sur ton compte 3B.';
    }
    state.pending={operationId:createOperationId(),baseRevision:state.serverRevision,data:candidate,localData:copy(latest.data),base:copy(state.base)};
    const committed=await flushPending(id,state,candidate),canonical=committed?.data||state.base;
    if(ticket===state.latest?.ticket){
     state.latest={...state.latest,data:canonical,base:canonical,baseKnown:true};
     persist(id,canonical,false,state);onReconcile?.(copy(canonical));
    }else{
     // The next checkpoint includes this device's just-committed run. Subtract
     // that run before rebasing, so a checkpoint arriving in flight is not counted twice.
     const newer=mergeGameProgress(latest.data,state.latest.data,canonical);
     state.latest={...state.latest,data:newer,base:copy(canonical),baseKnown:true};
     persist(id,newer,true,state);
    }
    return committed?.idempotent?'Sauvegarde confirmée sur ton compte 3B.':'Sauvegardé sur ton compte 3B.';
   }catch{
    const desired=state.latest?.data||snapshot;
    const kept=persist(id,desired,true,state);
    return kept?'Sauvegarde locale de ton compte · synchronisation en attente.':'Sauvegarde indisponible · exporte une copie.';
   }
  };
  state.chain=state.chain.then(operation,operation);return state.chain;
 }

 return{loadGameProgress:load,saveGameProgress:save};
}

const memberSaveStore=createMemberSaveStore();
export const loadGameProgress=memberSaveStore.loadGameProgress;
export const saveGameProgress=memberSaveStore.saveGameProgress;
