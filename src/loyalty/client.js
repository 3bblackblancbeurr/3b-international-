import {createClient} from '@supabase/supabase-js';

const DEFAULT_SUPABASE_URL='https://ttvhcezucsbbmnafrotq.supabase.co';
const DEFAULT_PUBLIC_KEY='sb_publishable_MQUCR8oNdpEgeO2iMKnLQw_wj5XdNC4';

export const NOSBLOC_STAGING_APP=String(import.meta.env?.VITE_NOSBLOC_STAGING_SYNC||'').toLowerCase()==='true';
export const SUPABASE_URL=String(import.meta.env.VITE_SUPABASE_URL||DEFAULT_SUPABASE_URL).replace(/\/+$/,'');
export const PUBLIC_KEY=String(import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY||DEFAULT_PUBLIC_KEY);

export const authClient=createClient(SUPABASE_URL,PUBLIC_KEY,{
 auth:{
  storageKey:NOSBLOC_STAGING_APP?'3b_nosbloc_staging_auth_v1':'3b_member_auth_v1',
  detectSessionInUrl:true,
  persistSession:true,
  autoRefreshToken:true
 }
});
export const MEMBER_AUTH_URL=SUPABASE_URL+'/functions/v1/member-auth';
export const MEMBER_API_URL=SUPABASE_URL+'/functions/v1/member-api';

const PUBLIC_ACTIONS=new Set(['register','register-v2','login','recover','recover-v2','reset-request','resend-confirmation']);

export async function memberRequest(action,body={},expectedUser){
 const {data:{session}}=await authClient.auth.getSession();
 if(expectedUser&&session?.user.id!==expectedUser)throw Error('La session a changé. Reconnecte-toi.');
 const isPublic=PUBLIC_ACTIONS.has(action);
 if(!isPublic&&!session)throw Error('Connecte-toi à ton compte 3B.');
 const response=await fetch(isPublic?MEMBER_AUTH_URL:MEMBER_API_URL,{
  method:'POST',
  headers:{
   apikey:PUBLIC_KEY,
   'Content-Type':'application/json',
   ...(!isPublic&&session?{Authorization:'Bearer '+session.access_token}:{})
  },
  body:JSON.stringify({action,...body}),
  signal:AbortSignal.timeout(15000)
 });
 const data=await response.json().catch(()=>({}));
 if(!response.ok)throw Error(data.error||'Connexion momentanément indisponible. Réessaie.');
 return data;
}

export async function checkoutAuth(){
 const {data:{session}}=await authClient.auth.getSession();
 return session?{Authorization:'Bearer '+session.access_token}:{};
}
