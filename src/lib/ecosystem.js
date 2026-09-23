import {authClient,SUPABASE_URL,PUBLIC_KEY} from '../loyalty/client.js';
import {reportClientIncident} from '../notifications/client.js';
export const ECOSYSTEM_PRIVATE_URL=SUPABASE_URL+'/functions/v1/ecosystem-private';
export const ECOSYSTEM_PUBLIC_URL=SUPABASE_URL+'/functions/v1/ecosystem-public';

export async function ecosystemPublic(section,options={}){
 const url=new URL(ECOSYSTEM_PUBLIC_URL);url.searchParams.set('section',section);
 const r=await fetch(url,{headers:{apikey:PUBLIC_KEY},signal:options.signal||AbortSignal.timeout(20000)});
 const data=await r.json().catch(()=>({}));
 if(!r.ok){if(r.status>=500)reportClientIncident('service',data.error||'Ecosystem public indisponible',section);throw Error(data.error||'Le service est momentanément indisponible. Réessaie.');}
 return data;
}

export async function ecosystem(action,body={},options={}){
 const{data:{session}}=await authClient.auth.getSession();
 if(!session)throw Error('Connecte-toi à ton compte 3B.');
 const r=await fetch(ECOSYSTEM_PRIVATE_URL,{method:'POST',headers:{apikey:PUBLIC_KEY,'Content-Type':'application/json',Authorization:'Bearer '+session.access_token},body:JSON.stringify({action,...body}),signal:options.signal||AbortSignal.timeout(action==='generate'?120000:action==='chat-ai'?90000:20000)});
 const data=await r.json().catch(()=>({}));
 if(!r.ok){if(r.status>=500)reportClientIncident(action==='generate'||action==='chat-ai'?'ai':'service',data.error||'Ecosystem privé indisponible',action);throw Error(data.error||'Le service est momentanément indisponible. Réessaie.');}
 return data;
}
