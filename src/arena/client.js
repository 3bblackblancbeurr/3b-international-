import {authClient,SUPABASE_URL,PUBLIC_KEY} from '../loyalty/client.js';
export async function arenaRequest(action,payload={},signal){
 const {data:{session}}=await authClient.auth.getSession();
 if(!session)throw Error('Connecte-toi à ton compte 3B pour jouer sur Internet.');
 const response=await fetch(SUPABASE_URL+'/functions/v1/card-arena',{method:'POST',signal:signal||AbortSignal.timeout(18000),headers:{'Content-Type':'application/json',apikey:PUBLIC_KEY,Authorization:'Bearer '+session.access_token},body:JSON.stringify({action,...payload})});
 const data=await response.json().catch(()=>null);
 if(!response.ok){const e=Error(data?.error||'Connexion interrompue. Réessaie pour reprendre ton duel.');e.status=response.status;throw e;}
 return data;
}
