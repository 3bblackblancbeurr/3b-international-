import {authClient} from '../loyalty/client.js';
import {readEvents,partialText} from './albert-stream.js';

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

export async function commandAIRequest(prompt,action='ai'){
 const{data:{session}}=await authClient.auth.getSession();
 if(!session)throw Error('Connecte-toi à ton compte 3B.');
 const response=await fetch(endpoint(),{
  method:'POST',
  headers:{Authorization:'Bearer '+session.access_token,'Content-Type':'application/json'},
  body:JSON.stringify({action,prompt}),
  signal:AbortSignal.timeout(30000)
 });
 const data=await response.json().catch(()=>({}));
 if(!response.ok)throw Error(data.error||'3B IA Command indisponible.');
 return data;
}

export async function albertRequest(body,{signal,onText,onStatus}={}){
 const{data:{session}}=await authClient.auth.getSession();
 if(!session)throw Error('Connecte-toi à ton compte 3B.');
 const res=await fetch(endpoint(),{method:'POST',headers:{Authorization:'Bearer '+session.access_token,'Content-Type':'application/json'},body:JSON.stringify(body),signal:signal?AbortSignal.any([signal,AbortSignal.timeout(60000)]):AbortSignal.timeout(30000)});
 if(!res.ok){const data=await res.json().catch(()=>({}));throw Error(data.error||'Albert indisponible.');}
 if(!res.headers.get('content-type')?.includes('text/event-stream'))return res.json();
 let raw='',result=null;
 for await(const event of readEvents(res.body)){
  if(event.type==='status')onStatus?.(event.text);
  if(event.type==='delta'){raw+=event.delta;onText?.(partialText(raw));}
  if(event.type==='error')throw Error(event.message);
  if(event.type==='complete')result={answer:event.answer};
 }
 if(!result)throw Error('Réponse interrompue. Aucune action appliquée.');
 return result;
}
