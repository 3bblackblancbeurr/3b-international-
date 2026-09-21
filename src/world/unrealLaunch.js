import {authClient,PUBLIC_KEY,SUPABASE_URL} from '../loyalty/client.js';

export const UNREAL_LAUNCH_ENABLED = import.meta.env.VITE_UNREAL_LAUNCH_ENABLED === 'true';

export async function createUnrealLaunchTicket(){
 const {data:{session}}=await authClient.auth.getSession();
 if(!session)throw Error('Connecte-toi à ton compte 3B avant d’ouvrir le client Unreal.');
 const response=await fetch(SUPABASE_URL+'/functions/v1/world-unreal-launch',{
  method:'POST',
  headers:{
   apikey:PUBLIC_KEY,
   Authorization:'Bearer '+session.access_token,
   'Content-Type':'application/json'
  },
  body:'{}',
  signal:AbortSignal.timeout(12000)
 });
 const data=await response.json().catch(()=>({}));
 if(!response.ok||!data.launch_url)throw Error(data.error||'Le portail Unreal 3B est momentanément indisponible.');
 return data;
}

export async function launchUnrealWorld(){
 const data=await createUnrealLaunchTicket();
 window.location.href=data.launch_url;
 return data;
}
