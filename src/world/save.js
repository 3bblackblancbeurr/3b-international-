import {authClient} from '../loyalty/client.js';
import {blankSave,normalizeSave} from './rules.js';
const queues=new Map();
const stateFor=id=>{if(!queues.has(id))queues.set(id,{chain:Promise.resolve(),known:false,rev:0,seq:0});return queues.get(id);};
const key=id=>'3b_world_v1_'+(id||'guest');
export function readLocal(id){try{const v=JSON.parse(localStorage.getItem(key(id)));return v?{...v,data:normalizeSave(v.data)}:null;}catch{return null;}}
export function writeLocal(id,data,dirty=true){try{localStorage.setItem(key(id),JSON.stringify({data:normalizeSave(data),dirty}));return true;}catch{return false;}}
export function mergeProgress(a,b){
 a=normalizeSave(a);b=normalizeSave(b);const collection={...a.collection};for(const [id,count] of Object.entries(b.collection))collection[id]=Math.max(collection[id]||0,count);
 return normalizeSave({...a,...(b.updatedAt>a.updatedAt?b:{}),collection,shards:Math.min(a.shards,b.shards),xp:Math.max(a.xp,b.xp),wins:Math.max(a.wins,b.wins),walked:Math.max(a.walked,b.walked),seals:[...a.seals,...b.seals],beacons:[...a.beacons,...b.beacons],visited:[...a.visited,...b.visited],finalOpened:a.finalOpened||b.finalOpened});
}
async function sessionFor(id){const {data:{session}}=await authClient.auth.getSession();if(session?.user.id!==id)throw Error('La session a changé.');}
async function fetchSave(id){await sessionFor(id);const {data,error}=await authClient.from('member_world_saves').select('data,revision').eq('user_id',id).maybeSingle().abortSignal(AbortSignal.timeout(8000));if(error)throw error;return data;}
export async function loadWorld(id){
 const local=readLocal(id);if(!id)return{data:local?.data||blankSave(),message:local?'Partie invitée retrouvée sur cet appareil.':'Sauvegarde automatique sur cet appareil.'};
 const state=stateFor(id);
 try{const remote=await fetchSave(id);state.known=true;state.rev=remote?.revision||0;const data=remote?(local?.dirty?mergeProgress(remote.data,local.data):normalizeSave(remote.data)):local?.data||readLocal(null)?.data||blankSave();writeLocal(id,data,!!local?.dirty||!remote);return{data,needsSave:!!local?.dirty||!remote,message:'Monde lié à ton compte 3B.'};}
 catch{return{data:local?.data||blankSave(),message:'Compte hors ligne · progression conservée sur cet appareil.'};}
}
export function saveWorld(id,data){
 const snapshot=normalizeSave(data),cached=writeLocal(id,snapshot);if(!id)return Promise.resolve({message:cached?'Sauvegardé sur cet appareil.':'Sauvegarde indisponible · télécharge une copie.'});
 const state=stateFor(id),seq=++state.seq;
 const operation=async()=>{
  let outgoing=snapshot;
  try{
   for(let attempt=0;attempt<3;attempt++){
    await sessionFor(id);
    if(!state.known||attempt){const remote=await fetchSave(id);state.rev=remote?.revision||0;state.known=true;if(remote)outgoing=mergeProgress(outgoing,remote.data);}
    const row={user_id:id,data:outgoing,revision:state.rev+1};
    const query=state.rev?authClient.from('member_world_saves').update({data:outgoing,revision:state.rev+1}).eq('user_id',id).eq('revision',state.rev):authClient.from('member_world_saves').insert(row);
    const {data:rows,error}=await query.select('revision').abortSignal(AbortSignal.timeout(8000));
    if(error&&error.code!=='23505')throw error;
    if(rows?.[0]){state.rev=rows[0].revision;if(seq===state.seq)writeLocal(id,outgoing,false);return{message:'Sauvegardé sur ton compte 3B.',...(seq===state.seq?{data:outgoing}:{})};}
   }
   return{pending:true,message:'Autre appareil actif · synchronisation à réessayer.'};
  }catch{state.known=false;return{pending:true,message:cached?'Compte : copie locale gardée · synchronisation en attente.':'Sauvegarde indisponible · télécharge une copie.'};}
 };
 state.chain=state.chain.then(operation,operation);return state.chain;
}
