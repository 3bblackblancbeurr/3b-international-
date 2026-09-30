import {authClient,PUBLIC_KEY,SUPABASE_URL} from '../loyalty/client.js';
import {createPasskeyLogin} from './login-passkey-core.js';
import {passkeySupported} from './security-client.js';
export const initialPasskeys=createPasskeyLogin({auth:authClient.auth,supported:passkeySupported,
 enabled:import.meta.env?.VITE_PASSPORT_INITIAL_PASSKEY_ENABLED==='true',
 readiness:async()=>{
   const response=await fetch(SUPABASE_URL+'/functions/v1/passport-auth',{method:'POST',headers:{apikey:PUBLIC_KEY,'Content-Type':'application/json'},body:JSON.stringify({action:'readiness'}),signal:AbortSignal.timeout(10000)});
   if(!response.ok)return {enabled:false,mode:'supabase_auth_passkey'};
   return response.json();
 }});
