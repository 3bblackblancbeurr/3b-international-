import {authClient,PUBLIC_KEY,SUPABASE_URL} from '../loyalty/client.js';

export const NOTIFICATION_CENTER_URL=SUPABASE_URL+'/functions/v1/notification-center';

export async function notificationRequest(action,body={},expectedUser){
 const{data:{session}}=await authClient.auth.getSession();
 if(!session)throw Error('Connecte-toi à ton compte 3B.');
 if(expectedUser&&session.user.id!==expectedUser)throw Error('La session a changé. Reconnecte-toi.');
 const response=await fetch(NOTIFICATION_CENTER_URL,{
  method:'POST',
  headers:{
   apikey:PUBLIC_KEY,
   Authorization:'Bearer '+session.access_token,
   'Content-Type':'application/json'
  },
  body:JSON.stringify({action,...body}),
  signal:AbortSignal.timeout(15000)
 });
 const data=await response.json().catch(()=>({}));
 if(!response.ok)throw Error(data.error||'Le Centre 3B est momentanément indisponible.');
 return data;
}

export function reportClientIncident(kind,message,route='',component=''){
 if(typeof navigator!=='undefined'&&!navigator.onLine)return Promise.resolve(null);
 return notificationRequest('client-incident',{
  kind,
  message:String(message||'Incident').slice(0,300),
  route:String(route||'').slice(0,80),
  component:String(component||'').slice(0,1200)
 }).catch(()=>null);
}
