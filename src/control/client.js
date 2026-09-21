import {authClient} from '../loyalty/client.js';

export const CONTROL_CENTER_URL='https://ttvhcezucsbbmnafrotq.supabase.co/functions/v1/control-center';

export async function controlCenterRequest(action='status',body={}){
 const{data:{session}}=await authClient.auth.getSession();
 if(!session)throw Error('Connecte-toi à ton compte 3B.');
 const response=await fetch(CONTROL_CENTER_URL,{
  method:'POST',
  headers:{
   apikey:'sb_publishable_MQUCR8oNdpEgeO2iMKnLQw_wj5XdNC4',
   Authorization:'Bearer '+session.access_token,
   'Content-Type':'application/json'
  },
  body:JSON.stringify({action,...body}),
  signal:AbortSignal.timeout(15000)
 });
 const data=await response.json().catch(()=>({}));
 if(!response.ok){
  const error=new Error(data.error||'Centre de commande indisponible.');
  error.status=response.status;
  throw error;
 }
 return data;
}
