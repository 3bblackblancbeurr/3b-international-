import {authClient} from '../loyalty/client.js';

const PROD_URL='https://3b-international.vercel.app/api/command-integrations';

function endpoint(){
 if(typeof window==='undefined')return PROD_URL;
 const native=Boolean(window.Capacitor?.isNativePlatform?.());
 const local=['localhost','127.0.0.1'].includes(window.location.hostname);
 if(native||window.location.protocol==='capacitor:')return PROD_URL;
 return local?'/api/command-integrations':'/api/command-integrations';
}

export async function commandIntegrationsStatus(){
 const{data:{session}}=await authClient.auth.getSession();
 if(!session)throw Error('Connecte-toi à ton compte 3B.');
 const response=await fetch(endpoint(),{
  method:'GET',
  headers:{Authorization:'Bearer '+session.access_token,Accept:'application/json'},
  cache:'no-store',
  signal:AbortSignal.timeout(25000)
 });
 const data=await response.json().catch(()=>({}));
 if(!response.ok)throw Error(data.error||'Intégrations Command OS indisponibles.');
 return data;
}

export async function commandAIRequest(prompt){
 const{data:{session}}=await authClient.auth.getSession();
 if(!session)throw Error('Connecte-toi à ton compte 3B.');
 const response=await fetch(endpoint(),{
  method:'POST',
  headers:{Authorization:'Bearer '+session.access_token,'Content-Type':'application/json'},
  body:JSON.stringify({action:'ai',prompt}),
  signal:AbortSignal.timeout(30000)
 });
 const data=await response.json().catch(()=>({}));
 if(!response.ok)throw Error(data.error||'3B IA Command indisponible.');
 return data;
}
