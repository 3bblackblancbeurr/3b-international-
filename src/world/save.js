import {authClient,SUPABASE_URL,PUBLIC_KEY} from '../loyalty/client.js';
import {blankSave,normalizeSave} from './rules.js';
import {applyWorldAction} from './engine.js';
const queues=new Map(),key=id=>'3b_world_v1_'+(id||'guest'),journalBase=id=>'3b_world_actions_v2_'+id,journalKey=(id,device)=>journalBase(id)+'_'+device,ackKey=(id,device)=>'3b_world_ack_v2_'+id+'_'+device;
export function readLocal(id){try{const v=JSON.parse(localStorage.getItem(key(id)));return v?{...v,data:normalizeSave(v.data)}:null;}catch{return null;}}
export function writeLocal(id,data,dirty=true){try{localStorage.setItem(key(id),JSON.stringify({data:normalizeSave(data),dirty}));return true;}catch{return false;}}
function stateFor(id){
 if(!queues.has(id)){let device,saved;try{device=sessionStorage.getItem('3b_world_tab_'+id);if(!device){device=crypto.randomUUID();sessionStorage.setItem('3b_world_tab_'+id,device);}saved=JSON.parse(localStorage.getItem(journalKey(id,device)));}catch{}
  queues.set(id,{device:device||crypto.randomUUID(),next:saved?.next||1,pending:Array.isArray(saved?.pending)?saved.pending:[],chain:Promise.resolve()});
 }return queues.get(id);
}
function persist(id,state){localStorage.setItem(journalKey(id,state.device),JSON.stringify({device:state.device,next:state.next,pending:state.pending}));}
export function recordWorldAction(id,save,action){
 const next=applyWorldAction(save,action);
 if(id){const state=stateFor(id);if(state.pending.length>=5000)throw Error('Synchronise ton compte avant de poursuivre. Le journal hors ligne est plein.');
  const entry={seq:state.next,action};state.pending.push(entry);state.next++;
  try{persist(id,state);}catch{state.next--;state.pending.pop();throw Error('Le navigateur ne peut plus conserver le journal. Télécharge ta sauvegarde.');}
 }
 writeLocal(id,next);return next;
}
async function request(id,state,commands){
 const {data:{session}}=await authClient.auth.getSession();if(session?.user.id!==id)throw Error('Reconnecte-toi pour synchroniser ton monde.');
 const response=await fetch(SUPABASE_URL+'/functions/v1/world-engine',{method:'POST',headers:{apikey:PUBLIC_KEY,Authorization:'Bearer '+session.access_token,'Content-Type':'application/json'},body:JSON.stringify({device:state.device,commands}),signal:AbortSignal.timeout(20000)});
 const result=await response.json().catch(()=>({}));if(!response.ok)throw Error(result.error||'Connexion momentanément indisponible.');return result;
}
function reconcile(id,state,result){
 state.pending=state.pending.filter(e=>e.seq>result.sequence);state.next=Math.max(state.next,result.sequence+1);let data=normalizeSave(result.data);
 for(const entry of state.pending)try{data=applyWorldAction(data,entry.action);}catch{/* The server acknowledges and explains conflicting actions. */}
 persist(id,state);writeLocal(id,data,!!state.pending.length);return data;
}
async function recoverOtherJournals(id,current){
 // Each tab has its own sequence. Read abandoned journals without rewriting a
 // different tab's queue; server receipts make concurrent recovery idempotent.
 const journals=[];for(let i=0;i<localStorage.length;i++){const name=localStorage.key(i);if(!name?.startsWith(journalBase(id))||name===journalKey(id,current.device))continue;try{const j=JSON.parse(localStorage.getItem(name));if(j?.device&&Array.isArray(j.pending))journals.push(j);}catch{}}
 for(const j of journals){let acknowledged=Number(localStorage.getItem(ackKey(id,j.device)))||0;const pending=j.pending.filter(e=>e.seq>acknowledged);
  for(let i=0;i<pending.length;i+=100){const result=await request(id,j,pending.slice(i,i+100));acknowledged=Math.max(acknowledged,result.sequence);localStorage.setItem(ackKey(id,j.device),String(acknowledged));}
 }
}
export async function loadWorld(id){
 const local=readLocal(id);if(!id)return{data:local?.data||blankSave(),message:local?'Partie invitée retrouvée sur cet appareil.':'Sauvegarde automatique sur cet appareil.'};
 const state=stateFor(id);
 try{
  if(local&&!localStorage.getItem(key(id)+'_before_chapters'))localStorage.setItem(key(id)+'_before_chapters',JSON.stringify(local));
  await recoverOtherJournals(id,state);
  const result=await request(id,state,state.pending.slice(0,100)),data=reconcile(id,state,result);
  return{data,needsSave:!!state.pending.length,message:result.rejected?.length?'Compte synchronisé · '+result.rejected[0].message:'Monde lié à ton compte · actions validées par le serveur.'};
 }catch(error){return{data:local?.data||blankSave(),needsSave:!!state.pending.length,message:'Copie locale · '+error.message};}
}
export function saveWorld(id,data){
 if(!id)return Promise.resolve({message:writeLocal(id,data,false)?'Sauvegardé sur cet appareil.':'Télécharge une copie : le stockage local est plein.'});
 const state=stateFor(id);
 const operation=async()=>{
  try{const result=await request(id,state,state.pending.slice(0,100)),next=reconcile(id,state,result);return{data:next,pending:!!state.pending.length,message:result.rejected?.length?'Compte synchronisé · '+result.rejected[0].message:state.pending.length?'Synchronisation du journal en cours…':'Sauvegardé sur ton compte · gains et compagnons validés.'};}
  catch(error){return{pending:true,message:'Copie locale gardée · '+error.message};}
 };
 state.chain=state.chain.then(operation,operation);return state.chain;
}
