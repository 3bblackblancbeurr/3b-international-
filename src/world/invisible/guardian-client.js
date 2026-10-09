import {authClient,SUPABASE_URL,PUBLIC_KEY} from '../../loyalty/client.js';
import {INVISIBLE_EPISODES,INVISIBLE_REALMS,getInvisibleEpisode} from './catalog.js';
import {normalizeInvisibleState,invisibleEpisodeProgress} from './progression.js';
import {GUARDIAN_STORIES} from '../story-canon.js';
import {narrativeGuardian} from './guardian-story.js';

const URL=SUPABASE_URL+'/functions/v1/invisible-guardian';
export function localGuardianReply(save,message){
 const state=normalizeInvisibleState(save?.invisible),episode=getInvisibleEpisode(state.activeEpisode),realm=episode.realm;
 const options={progress:invisibleEpisodeProgress(state,episode.id),persona:GUARDIAN_STORIES[realm],realmName:INVISIBLE_REALMS.find(row=>row.id===realm)?.name,completedPortals:INVISIBLE_EPISODES.filter(row=>invisibleEpisodeProgress(state,row.id).portalOpened).length};
 return{source:'narrative',reason:'local',guardian:episode.guardian,episodeId:episode.id,realm,text:narrativeGuardian(state,message,episode,options)};
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
 try{
  const result=await invisibleRequest('dialog',{message,history:dialogue},expectedUser,signal);
  if(result.episodeId&&result.episodeId!==getInvisibleEpisode(save?.invisible?.activeEpisode).id){const error=Error('L’épisode actif attend encore sa synchronisation. Patiente un instant puis réessaie.');error.status=409;throw error;}
  return result;
 }
 catch(error){
  if(signal?.aborted||[400,401,403,409,413,415,429].includes(error.status)||/session|Connecte-toi/.test(error.message))throw error;
  return{...localGuardianReply(save,message),reason:'offline',unavailable:true};
 }
}

export const readInvisibleCooperation=(expectedUser,signal)=>invisibleRequest('cooperationSnapshot',{},expectedUser,signal);
export const contributeInvisibleEcho=(realm,expectedUser,signal)=>invisibleRequest('contribute',{realm},expectedUser,signal);
export const readGuardianCapabilities=(expectedUser,signal)=>invisibleRequest('capabilities',{},expectedUser,signal);
export const solveInvisibleCollective=(answer,expectedUser,signal)=>invisibleRequest('solveCollective',{answer},expectedUser,signal);
export const readInvisibleEvents=(event,expectedUser,signal)=>invisibleRequest('eventsSnapshot',event?{event}:{},expectedUser,signal);
export const contributeInvisibleEvent=(event,realm,expectedUser,signal)=>invisibleRequest('contributeEvent',{event,realm},expectedUser,signal);
export const solveInvisibleEvent=(event,answer,expectedUser,signal)=>invisibleRequest('solveEvent',{event,answer},expectedUser,signal);
