import {authClient,PUBLIC_KEY,SUPABASE_URL} from '../loyalty/client.js';
import {decodeBase64url,encodeBase64url} from '../../supabase/functions/_shared/passport-security.js';

export async function passportSecurityRequest(service,action,body={},expectedUser) {
  const {data:{session}}=await authClient.auth.getSession();
  if(!session||!expectedUser||session.user.id!==expectedUser)throw Error('La session a changé. Reconnecte-toi.');
  const response=await fetch(SUPABASE_URL+'/functions/v1/'+service,{method:'POST',
    headers:{apikey:PUBLIC_KEY,Authorization:'Bearer '+session.access_token,'Content-Type':'application/json'},
    body:JSON.stringify({...body,action}),signal:AbortSignal.timeout(20000)});
  const result=await response.json().catch(()=>({}));
  if(!response.ok)throw Error(result.error||'Cette fonction est en préparation.');
  const {data:{session:current}}=await authClient.auth.getSession();
  if(current?.user.id!==expectedUser)throw Error('La session a changé. Reconnecte-toi.');
  return result;
}
export function browserOptions(options,register=false) {
  const publicKey={...options,challenge:decodeBase64url(options.challenge)};
  if(register) {
    publicKey.user={...options.user,id:decodeBase64url(options.user.id)};
    publicKey.excludeCredentials=(options.excludeCredentials||[]).map(value=>({...value,id:decodeBase64url(value.id)}));
  } else publicKey.allowCredentials=(options.allowCredentials||[]).map(value=>({...value,id:decodeBase64url(value.id)}));
  return {publicKey};
}
export function credentialResponse(credential) {
  if(!credential)throw Error('Confirmation annulée.');
  if(typeof credential.toJSON==='function')return credential.toJSON();
  const result={id:credential.id,rawId:encodeBase64url(new Uint8Array(credential.rawId)),type:credential.type,
    authenticatorAttachment:credential.authenticatorAttachment||undefined,clientExtensionResults:credential.getClientExtensionResults(),response:{}};
  for(const field of ['clientDataJSON','attestationObject','authenticatorData','signature','userHandle']) {
    const value=credential.response[field];
    if(value)result.response[field]=encodeBase64url(new Uint8Array(value));
  }
  if(credential.response.getTransports)result.response.transports=credential.response.getTransports();
  return result;
}
export function passkeySupported() {
  return typeof window!=='undefined'&&window.isSecureContext&&!!window.PublicKeyCredential&&!!navigator.credentials;
}
