import {api,authenticate,Failure,rate,rpc,serve,sha256} from '../_shared/passport-server.ts';
import {audience,normalizePilotScopes,pairwiseSubject,randomToken} from '../_shared/passport-security.js';

const ENABLED=Deno.env.get('PASSPORT_PARTNER_PILOT_ENABLED')==='true';
const SECRET=Deno.env.get('PASSPORT_PARTNER_SUBJECT_SECRET')||'';
const APP=(Deno.env.get('APP_URL')||'https://3b-international.vercel.app').replace(/\/$/,'');
const tokenHash=async(value:unknown)=>{
  if(typeof value!=='string'||!/^[0-9a-f]{64}$/.test(value)) throw new Failure(400,'Lien de demande invalide.');
  return sha256(value);
};
async function request(hash:string) {
  const rows=await api('/rest/v1/passport_partner_requests?request_hash=eq.'+hash+'&select=*&limit=1');
  if(!rows?.[0]||rows[0].state!=='pending'||Date.parse(rows[0].expires_at)<=Date.now()) throw new Failure(410,'Cette demande a expiré ou a déjà été utilisée.');
  const clients=await api('/rest/v1/passport_partner_clients?client_id=eq.'+encodeURIComponent(rows[0].client_id)+
    '&enabled=eq.true&select=client_id,display_name,audience,allowed_scopes,purpose&limit=1');
  const client=clients?.[0];
  if(!client||client.audience!==rows[0].audience||rows[0].scopes.some((scope:string)=>!client.allowed_scopes.includes(scope)))
    throw new Failure(403,'Ce partenaire n’est plus autorisé.');
  return {...rows[0],client};
}
async function partner(body:Record<string,unknown>) {
  const clientId=String(body.clientId||'');
  if(!/^[a-z0-9._:-]{3,96}$/.test(clientId)||typeof body.clientSecret!=='string'||!/^[0-9a-f]{64}$/.test(body.clientSecret))
    throw new Failure(401,'Partenaire non autorisé.');
  const secretHash=await sha256(body.clientSecret);
  const rows=await api('/rest/v1/passport_partner_clients?client_id=eq.'+encodeURIComponent(clientId)+
    '&enabled=eq.true&secret_hash=eq.'+secretHash+'&select=client_id&limit=1');
  if(!rows?.[0])throw new Failure(401,'Partenaire non autorisé.');
  await rate('passport-partner:'+clientId,60,300);
  return {clientId,secretHash};
}

serve(async(req,body)=>{
  const action=String(body.action||'');
  if(action==='readiness') {await authenticate(req);return {enabled:ENABLED&&SECRET.length>=32,mode:'online_pilot',scopes:['passport.basic','identity.verified'],ageAttestationEnabled:false};}
  if(!ENABLED||SECRET.length<32)throw new Failure(503,'Les échanges partenaires sont en préparation.');
  if(action==='create'||action==='redeem') {
    const {clientId,secretHash}=await partner(body);
    let intendedAudience:string;
    try { intendedAudience=audience(String(body.audience||'')); } catch {throw new Failure(400,'Destinataire invalide.');}
    const nonce=String(body.nonce||'');
    if(!/^[A-Za-z0-9_-]{32,128}$/.test(nonce))throw new Failure(400,'Nonce aléatoire de 32 caractères minimum requis.');
    if(action==='create') {
      let scopes:string[];
      try {scopes=normalizePilotScopes(body.scopes);} catch {throw new Failure(400,'Informations demandées non autorisées.');}
      const requestToken=randomToken();
      await rpc('passport_partner_request_create',{p_client:clientId,p_secret:secretHash,p_audience:intendedAudience,p_nonce:nonce,p_scopes:scopes,p_request:await sha256(requestToken)});
      return {requestToken,consentUrl:APP+'/?page=passport&passport_request='+requestToken,expiresIn:180};
    }
    return rpc('passport_partner_redeem',{p_client:clientId,p_secret:secretHash,p_audience:intendedAudience,p_nonce:nonce,p_request:await tokenHash(body.requestToken)});
  }
  const {userId,sessionId}=await authenticate(req);
  await rate(userId+':passport-partner',30,300);
  if(action==='preview') {
    const pending=await request(await tokenHash(body.requestToken));
    return {partner:{name:pending.client.display_name,audience:pending.audience,purpose:pending.client.purpose},
      scopes:pending.scopes,expiresAt:pending.expires_at,requiresPasskey:true,
      disclosure:'Seuls l’état actif du Passeport et, si demandé, le résultat de vérification d’identité sont transmis. Aucun nom civil, date de naissance, e-mail ou solde.'};
  }
  if(action==='approve') {
    if(body.consent!==true)throw new Failure(400,'Ton accord explicite est nécessaire.');
    const hash=await tokenHash(body.requestToken),pending=await request(hash);
    let scopes:string[];try{scopes=normalizePilotScopes(body.scopes);}catch{throw new Failure(400,'Accord invalide.');}
    const consentId=await rpc('passport_partner_approve',{p_user:userId,p_session:sessionId,p_request:hash,p_scopes:scopes,
      p_subject:await pairwiseSubject(userId,pending.client_id,SECRET),p_proof:await tokenHash(body.stepupToken)});
    return {approved:true,consentId};
  }
  if(action==='decline')return {declined:await rpc('passport_partner_decline',{p_user:userId,p_session:sessionId,p_request:await tokenHash(body.requestToken)})};
  if(action==='consents') {
    const rows=await api('/rest/v1/passport_partner_consents?user_id=eq.'+userId+'&select=id,client_id,scopes,granted_at,revoked_at&order=granted_at.desc&limit=100');
    const clients=await api('/rest/v1/passport_partner_clients?select=client_id,display_name,audience');
    const byId=new Map((clients||[]).map((client:Record<string,unknown>)=>[client.client_id,client]));
    return {consents:(rows||[]).map((row:Record<string,unknown>)=>({...row,partner:byId.get(row.client_id)||null}))};
  }
  if(action==='revoke') {
    const id=String(body.consentId||'');if(!/^[0-9a-f-]{36}$/i.test(id))throw new Failure(400,'Accord invalide.');
    return {revoked:await rpc('passport_partner_revoke',{p_user:userId,p_session:sessionId,p_consent:id})};
  }
  throw new Failure(404,'Action inconnue.');
});
