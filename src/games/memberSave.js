import {authClient,PUBLIC_KEY,SUPABASE_URL} from '../loyalty/client.js';
import {loadProgress,saveProgress,validateProgress,freshProgress} from './save.js';
const states=new Map();
const stateFor=id=>{if(!states.has(id))states.set(id,{chain:Promise.resolve(),revision:0,known:false});return states.get(id);};
const keyFor=id=>'3b_arcade_account_'+id;
const readCache=id=>{try{const c=JSON.parse(localStorage.getItem(keyFor(id)));return c?{...c,data:validateProgress(c.data)}:null;}catch{return null;}};
const cache=(id,data,dirty,baseKnown=stateFor(id).known)=>{try{localStorage.setItem(keyFor(id),JSON.stringify({data,dirty,baseKnown}));return true;}catch{return false;}};
async function request(id,body){
 const {data:{session}}=await authClient.auth.getSession();if(session?.user.id!==id)throw Error('Compte déconnecté.');
 const response=await fetch(SUPABASE_URL+'/rest/v1/member_game_saves'+(body?'':'?user_id=eq.'+id+'&select=data'),{method:body?'POST':'GET',headers:{apikey:PUBLIC_KEY,Authorization:'Bearer '+session.access_token,'Content-Type':'application/json',Prefer:'resolution=merge-duplicates'},...(body?{body:JSON.stringify({user_id:id,data:body,updated_at:new Date().toISOString()})}:{}),signal:AbortSignal.timeout(7000)});
 if(!response.ok)throw Error('Sauvegarde momentanément indisponible.');return body?null:response.json();
}
export async function loadGameProgress(user){
 if(!user)return loadProgress();const id=user.id,local=readCache(id);
 try{const rows=await request(id);stateFor(id).known=true;
  let data=rows[0]?.data?validateProgress(rows[0].data):null;
  // Only a new empty account inherits this device's guest save; never replace an existing account's save.
  if(!data)data=local?.data||(await loadProgress()).data;
  if(local?.dirty&&local.baseKnown)data=local.data;cache(id,data,!!local?.dirty&&!!local.baseKnown);
  return{data,message:'Progression liée à ton compte 3B.',online:true};
 }catch{return{data:local?.data||freshProgress(),message:'Hors ligne : sauvegarde de ce compte conservée sur cet appareil.',online:false};}
}
export function saveGameProgress(data,user){
 if(!user)return saveProgress(data);const id=user.id,s=stateFor(id),snapshot=validateProgress(data),revision=++s.revision,cached=cache(id,snapshot,true);
 const operation=async()=>{try{if(!s.known){const existing=await request(id);if(existing[0]?.data)return'Une sauvegarde existe déjà en ligne. Exporte cette partie puis rouvre les jeux pour la retrouver.';s.known=true;}await request(id,snapshot);if(revision===s.revision)cache(id,snapshot,false);return'Sauvegardé sur ton compte 3B.';}catch{return cached?'Sauvegarde locale de ton compte · synchronisation en attente.':'Sauvegarde indisponible · exporte une copie.';}};
 s.chain=s.chain.then(operation,operation);return s.chain;
}
