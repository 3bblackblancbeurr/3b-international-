import {authClient,SUPABASE_URL,PUBLIC_KEY} from '../loyalty/client.js';
export const ECOSYSTEM_URL=SUPABASE_URL+'/functions/v1/ecosystem';
export async function ecosystem(action,body={},options={}){
 const{data:{session}}=await authClient.auth.getSession();
 const r=await fetch(ECOSYSTEM_URL,{method:'POST',headers:{apikey:PUBLIC_KEY,'Content-Type':'application/json',...(session?{Authorization:'Bearer '+session.access_token}:{})},body:JSON.stringify({action,...body}),signal:options.signal||AbortSignal.timeout(action==='generate'?120000:action==='chat-ai'?90000:20000)});
 const data=await r.json().catch(()=>({}));if(!r.ok)throw Error(data.error||'Le service est momentanément indisponible. Réessaie.');return data;
}
