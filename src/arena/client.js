import {authClient,SUPABASE_URL,PUBLIC_KEY} from '../loyalty/client.js';
import {isNativeApp,PUBLIC_APP_URL} from '../native/runtime.js';
import {reportClientIncident} from '../notifications/client.js';

export function arenaEndpoint(native=isNativeApp()){
 return native ? PUBLIC_APP_URL+'api/card-arena-proxy' : SUPABASE_URL+'/functions/v1/card-arena';
}

export async function arenaRequest(action,payload={},signal){
 const {data:{session}}=await authClient.auth.getSession();
 if(!session)throw Error('Connecte-toi à ton compte 3B pour jouer sur Internet.');
 const native=isNativeApp();
 const response=await fetch(arenaEndpoint(native),{
  method:'POST',
  signal:signal||AbortSignal.timeout(18000),
  headers:{'Content-Type':'application/json',...(native?{}:{apikey:PUBLIC_KEY}),Authorization:'Bearer '+session.access_token},
  body:JSON.stringify({action,...payload})
 });
 const data=await response.json().catch(()=>null);
 if(!response.ok){const e=Error(data?.error||'Connexion interrompue. Réessaie pour reprendre ton duel.');e.status=response.status;if(response.status>=500)reportClientIncident('game',e.message,'arena:'+action);throw e;}
 return data;
}
