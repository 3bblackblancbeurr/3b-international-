import {generateRegistrationOptions,verifyRegistrationResponse,generateAuthenticationOptions,verifyAuthenticationResponse} from '@simplewebauthn/server';
import {api,authenticate,Failure,rate,rpc,serve,sha256,bundledKey} from '../_shared/passport-server.ts';
import {randomToken,decodeBase64url,encodeBase64url,validateWebAuthnClient} from '../_shared/passport-security.js';

const ENABLED=Deno.env.get('PASSPORT_PASSKEY_STEPUP_ENABLED')==='true';
const ORIGIN=(Deno.env.get('APP_URL')||'https://3b-international.vercel.app').replace(/\/$/,'');
const RP_ID=Deno.env.get('PASSPORT_WEBAUTHN_RP_ID')||new URL(ORIGIN).hostname;
const configured=()=>ENABLED&&new URL(ORIGIN).protocol==='https:'&&new URL(ORIGIN).origin===ORIGIN&&new URL(ORIGIN).hostname===RP_ID;
const tokenHash=async(value:unknown)=>{
  if(typeof value!=='string'||!/^[0-9a-f]{64}$/.test(value))throw new Failure(400,'Confirmation invalide.');
  return sha256(value);
};
const credentials=(user:string)=>api('/rest/v1/passport_passkeys?user_id=eq.'+user+'&revoked_at=is.null&select=*&limit=10');
async function context(body:Record<string,unknown>) {
  if(body.purpose==='partner_approve')return tokenHash(body.requestToken);
  if(body.purpose==='credential_manage') {
    if(body.cardId!==undefined) {
      if(typeof body.cardId!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(body.cardId)||body.credentialId!==undefined)throw new Failure(400,'Carte invalide.');
      return sha256('card_activate:'+body.cardId);
    }
    const id=body.credentialId;
    if(id!==undefined&&(typeof id!=='string'||!/^[A-Za-z0-9_-]{16,1400}$/.test(id)))throw new Failure(400,'Clé invalide.');
    return sha256(id?'revoke:'+id:'credential_enroll');
  }
  throw new Failure(400,'Confirmation inconnue.');
}
async function remember(user:string,session:string,challenge:string,purpose:string,contextHash:string) {
  const rows=await api('/rest/v1/passport_webauthn_challenges',{user_id:user,session_id:session,
    challenge_hash:await sha256(challenge),purpose,context_hash:contextHash});
  return rows[0].id;
}

serve(async(req,body)=>{
  const {userId,sessionId}=await authenticate(req);
  const action=String(body.action||'');
  if(action==='readiness')return {enabled:configured(),mode:'session_stepup',rpId:RP_ID,origin:ORIGIN};
  await rate(userId+':passport-passkeys',30,300);
  if(action==='sessions-revoke') {
    const base=Deno.env.get('SUPABASE_URL')||'',key=bundledKey('SUPABASE_PUBLISHABLE_KEYS','SUPABASE_ANON_KEY');
    const response=await fetch(base+'/auth/v1/logout?scope=others',{method:'POST',headers:{apikey:key,
      Authorization:req.headers.get('authorization')!},signal:AbortSignal.timeout(12000)});
    if(!response.ok)throw new Failure(503,'La déconnexion des autres appareils n’a pas abouti. Réessaie.');
    return {sessionsRevoked:true};
  }
  if(!configured())throw new Failure(503,'Les clés de confirmation sont en préparation.');
  if(action==='list') {
    const rows=await credentials(userId);
    return {credentials:rows.map((row:Record<string,unknown>)=>({id:row.credential_id,label:row.label,createdAt:row.created_at,lastUsedAt:row.last_used_at}))};
  }
  if(action==='register-options') {
    await rpc('passport_assert_member',{p_user:userId,p_session:sessionId});
    const existing=await credentials(userId);
    let accounts=await api('/rest/v1/passport_passkey_accounts?user_id=eq.'+userId+'&select=user_handle&limit=1');
    if(!accounts.length) {
      try {accounts=await api('/rest/v1/passport_passkey_accounts',{user_id:userId});}
      catch {accounts=await api('/rest/v1/passport_passkey_accounts?user_id=eq.'+userId+'&select=user_handle&limit=1');}
    }
    if(!accounts?.[0])throw new Failure(503,'Préparation de la clé indisponible.');
    const userHandle=Uint8Array.from(String(accounts[0].user_handle).match(/.{2}/g)!,byte=>parseInt(byte,16));
    const options=await generateRegistrationOptions({rpName:'Passeport 3B',rpID:RP_ID,userID:userHandle,
      userName:'Membre 3B',userDisplayName:'Mon Passeport 3B',attestationType:'none',
      excludeCredentials:existing.map((row:Record<string,unknown>)=>({id:String(row.credential_id),transports:row.transports as any})),
      authenticatorSelection:{residentKey:'required',userVerification:'required'},supportedAlgorithmIDs:[-7,-257]});
    const challengeId=await remember(userId,sessionId,options.challenge,'register',await sha256('credential_enroll'));
    return {options,challengeId,existingCredentialRequired:existing.length>0};
  }
  if(action==='register-finish') {
    const challengeId=String(body.challengeId||'');
    const challenge=await rpc('passport_webauthn_take',{p_user:userId,p_session:sessionId,p_challenge:challengeId,p_purpose:'register'});
    let verified;
    try {validateWebAuthnClient(body.response,ORIGIN,undefined);verified=await verifyRegistrationResponse({response:body.response as any,
      expectedChallenge:async(value:string)=>await sha256(value)===challenge.challenge_hash,
      expectedOrigin:ORIGIN,expectedRPID:RP_ID,requireUserVerification:true});}
    catch {throw new Failure(400,'La clé n’a pas pu être vérifiée. Recommence.');}
    if(!verified.verified||!verified.registrationInfo)throw new Failure(400,'La clé n’a pas pu être vérifiée.');
    const info=verified.registrationInfo;
    const contextHash=await sha256('credential_enroll');
    await rpc('passport_webauthn_register',{p_user:userId,p_session:sessionId,p_challenge:challengeId,
      p_credential:info.credential.id,p_key:encodeBase64url(info.credential.publicKey),p_counter:info.credential.counter,
      p_transports:info.credential.transports||[],p_label:String(body.label||'Ma clé d’accès').trim().slice(0,60)||'Ma clé d’accès',
      p_device:info.credentialDeviceType,p_backed_up:info.credentialBackedUp,
      p_proof:body.stepupToken?await tokenHash(body.stepupToken):null,p_context:contextHash});
    return {registered:true};
  }
  if(action==='authenticate-options') {
    const purpose=String(body.purpose||''),contextHash=await context(body),existing=await credentials(userId);
    if(!existing.length)throw new Failure(409,'Ajoute d’abord une clé de confirmation après une connexion récente.');
    const options=await generateAuthenticationOptions({rpID:RP_ID,userVerification:'required',
      allowCredentials:existing.map((row:Record<string,unknown>)=>({id:String(row.credential_id),transports:row.transports as any}))});
    const challengeId=await remember(userId,sessionId,options.challenge,purpose,contextHash);
    return {options,challengeId};
  }
  if(action==='authenticate-finish') {
    const purpose=String(body.purpose||'');
    if(!['partner_approve','credential_manage'].includes(purpose))throw new Failure(400,'Confirmation inconnue.');
    const challengeId=String(body.challengeId||'');
    const challenge=await rpc('passport_webauthn_take',{p_user:userId,p_session:sessionId,p_challenge:challengeId,p_purpose:purpose});
    const response=body.response as any;
    const existing=await credentials(userId),key=existing.find((row:Record<string,unknown>)=>row.credential_id===response?.id);
    if(!key)throw new Failure(403,'Clé non reconnue ou révoquée.');
    let verified;
    try {
      const account=await api('/rest/v1/passport_passkey_accounts?user_id=eq.'+userId+'&select=user_handle&limit=1');
      if(!account?.[0])throw Error('Unknown credential account');
      validateWebAuthnClient(response,ORIGIN,account[0].user_handle);
      verified=await verifyAuthenticationResponse({response,expectedChallenge:async(value:string)=>await sha256(value)===challenge.challenge_hash,
      expectedOrigin:ORIGIN,expectedRPID:RP_ID,requireUserVerification:true,
      credential:{id:key.credential_id,publicKey:decodeBase64url(key.public_key),counter:Number(key.counter),transports:key.transports}});}
    catch {throw new Failure(400,'La confirmation n’a pas pu être vérifiée. Recommence.');}
    if(!verified.verified)throw new Failure(400,'Confirmation non vérifiée.');
    const stepupToken=randomToken();
    await rpc('passport_webauthn_confirm',{p_user:userId,p_session:sessionId,p_challenge:challengeId,p_credential:key.credential_id,
      p_old_counter:key.counter,p_new_counter:verified.authenticationInfo.newCounter,p_proof:await sha256(stepupToken)});
    return {stepupToken,expiresIn:60};
  }
  if(action==='revoke') {
    const id=String(body.credentialId||'');
    if(!/^[A-Za-z0-9_-]{16,1400}$/.test(id))throw new Failure(400,'Clé invalide.');
    return {revoked:await rpc('passport_passkey_revoke',{p_user:userId,p_session:sessionId,p_credential:id,
      p_proof:await tokenHash(body.stepupToken),p_context:await sha256('revoke:'+id)})};
  }
  throw new Failure(404,'Action inconnue.');
});
