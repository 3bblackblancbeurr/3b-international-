import {createClient} from '@supabase/supabase-js';

export const SUPABASE_URL='https://ttvhcezucsbbmnafrotq.supabase.co';
export const PUBLIC_KEY='sb_publishable_MQUCR8oNdpEgeO2iMKnLQw_wj5XdNC4';
export const authClient=createClient(SUPABASE_URL,PUBLIC_KEY,{
 auth:{
  storageKey:'3b_member_auth_v1',
  detectSessionInUrl:true,
  persistSession:true,
  autoRefreshToken:true
 }
});
export const MEMBER_AUTH_URL=SUPABASE_URL+'/functions/v1/member-auth';
export const MEMBER_API_URL=SUPABASE_URL+'/functions/v1/member-api';
export const PASSPORT_IDENTITY_URL=SUPABASE_URL+'/functions/v1/passport-identity';

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


export async function passportVerificationRequest(expectedUser){
 const {data:{session}}=await authClient.auth.getSession();
 if(!session)throw Error('Connecte-toi à ton compte 3B.');
 if(expectedUser&&session.user.id!==expectedUser)throw Error('La session a changé. Reconnecte-toi.');
 const response=await fetch(PASSPORT_IDENTITY_URL,{
  method:'POST',
  headers:{
   apikey:PUBLIC_KEY,
   Authorization:'Bearer '+session.access_token,
   'Content-Type':'application/json'
  },
  body:'{}',
  cache:'no-store',
  signal:AbortSignal.timeout(12000)
 });
 const data=await response.json().catch(()=>({}));
 if(!response.ok)throw Error(data.error||'Impossible de générer la preuve du Passeport.');
 return data;
}
