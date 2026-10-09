import {authClient,SUPABASE_URL,PUBLIC_KEY} from '../../loyalty/client.js';
import {INVISIBLE_EPISODE} from './catalog.js';
import {normalizeInvisibleState} from './progression.js';
import {narrativeGuardian} from './guardian-story.js';

const URL=SUPABASE_URL+'/functions/v1/invisible-guardian';
export function localGuardianReply(save,message){
 return{source:'narrative',guardian:INVISIBLE_EPISODE.guardian,text:narrativeGuardian(normalizeInvisibleState(save?.invisible),message,INVISIBLE_EPISODE)};
}
export async function invisibleRequest(action,body={},expectedUser,signal){
 const {data:{session}}=await authClient.auth.getSession();
 if(!session?.user?.id||session.user.is_anonymous)throw Error('Connecte-toi à ton compte 3B.');
 if(expectedUser&&session.user.id!==expectedUser)throw Error('La session a changé. Reconnecte-toi.');
 const uid=session.user.id;
 const response=await fetch(URL,{method:'POST',headers:{apikey:PUBLIC_KEY,Authorization:'Bearer '+session.access_token,'Content-Type':'application/json'},body:JSON.stringify({action,...body}),signal:signal?AbortSignal.any([signal,AbortSignal.timeout(35000)]):AbortSignal.timeout(35000)});
 const result=await response.json().catch(()=>({}));
 const {data:{session:current}}=await authClient.auth.getSession();
 if(current?.user?.id!==uid)throw Error('La session a changé. Reconnecte-toi.');
 if(!response.ok){const error=Error(result.error||'Le Gardien est momentanément indisponible.');error.status=response.status;throw error;}
 return result;
}
export async function askGuardian({save,message,history=[],expectedUser,signal}){
 if(!expectedUser)return localGuardianReply(save,message);
 const dialogue=history.slice(-6).map(row=>({role:row.role,content:row.content}));
 while(dialogue.length&&dialogue.reduce((size,row)=>size+row.content.length,0)+message.length>4000)dialogue.splice(0,2);
 try{return await invisibleRequest('dialog',{message,history:dialogue},expectedUser,signal);}
 catch(error){
  if(signal?.aborted||[400,401,403,413,415,429].includes(error.status)||/session|Connecte-toi/.test(error.message))throw error;
  return{...localGuardianReply(save,message),unavailable:true};
 }
}

export const readInvisibleCooperation=(expectedUser,signal)=>invisibleRequest('cooperationSnapshot',{},expectedUser,signal);
export const contributeInvisibleEcho=(realm,expectedUser,signal)=>invisibleRequest('contribute',{realm},expectedUser,signal);
