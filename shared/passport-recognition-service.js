import {RECOGNITION_SCOPES,PROOF_TTL_SECONDS,httpsURL,generateSigningJWK,loadSigningKey,randomSecret,pairwiseSubject,sha256,isUUID,isNonce,scopesFor,signProof,verifyProof} from './passport-recognition.js';
import {PassportFailure,readPassportBody,passportOrigins} from './passport-recognition-runtime.js';

const first=value=>Array.isArray(value)?value[0]:value;
const fieldSet=(body,fields)=>{
  if(Object.keys(body).some(key=>!fields.includes(key))) throw new PassportFailure(400,'Une information non autorisée a été envoyée.');
};

export function createRecognitionHandler(runtime) {
  const {api,authenticate,getEnv,baseURL,appURL}=runtime;
  const origins=passportOrigins(appURL);
  const issuer=getEnv('PASSPORT_RECOGNITION_ISSUER')||appURL;
  const endpoint=baseURL+'/functions/v1/passport-recognition';
  let savedConfiguration=null,configurationUntil=0;

  async function configuration() {
    if(savedConfiguration && configurationUntil>Date.now()) return savedConfiguration;
    const explicit=(getEnv('PASSPORT_RECOGNITION_ENABLED')||'').trim().toLowerCase();
    const missing=[];
    let enabled=explicit==='true',material=null,pairwise='';
    if(!httpsURL(issuer)) missing.push('issuer_invalid');
    if(explicit && explicit!=='true') missing.push('recognition_disabled');
    if(explicit!=='false' && (!explicit || explicit==='true') && !missing.includes('issuer_invalid')) try {
      let key=getEnv('PASSPORT_RECOGNITION_SIGNING_JWK'),secret=getEnv('PASSPORT_RECOGNITION_PAIRWISE_SECRET');
      if(!key || !secret) {
        const proposedKey=key?JSON.parse(key):await generateSigningJWK();
        const proposedSecret=secret||randomSecret();
        // Validate key consistency and the effective KID before saving anything.
        const checked=await loadSigningKey(proposedKey,getEnv('PASSPORT_RECOGNITION_SIGNING_KID')||undefined);
        if(typeof proposedSecret!=='string'||proposedSecret.length<32)throw Error('Invalid pseudonymisation configuration');
        const vaultKey={kty:'EC',crv:'P-256',x:checked.publicJWK.x,y:checked.publicJWK.y,d:proposedKey.d,kid:checked.kid,alg:'ES256',use:'sig',key_ops:['sign']};
        const stored=first(await api('/rest/v1/rpc/passport_recognition_signing_material_v1',{p_signing_jwk:vaultKey,p_pairwise_secret:proposedSecret}));
        enabled=explicit==='true'?true:stored?.enabled===true;
        key=key||stored?.signing_jwk;
        secret=secret||stored?.pairwise_secret;
      } else if(explicit==='true') enabled=true;
      else enabled=first(await api('/rest/v1/passport_recognition_settings?singleton=eq.true&select=enabled&limit=1'))?.enabled===true;
      if(typeof secret!=='string' || secret.length<32) throw Error('Missing pseudonymisation');
      material=await loadSigningKey(key,getEnv('PASSPORT_RECOGNITION_SIGNING_KID')||undefined);
      pairwise=secret;
    } catch {missing.push('signing_unavailable');}
    if(!enabled && !missing.includes('recognition_disabled')) missing.push('recognition_disabled');
    savedConfiguration={configured:Boolean(material && httpsURL(issuer)),enabled,material,pairwise,missing};
    configurationUntil=Date.now()+30000;
    return savedConfiguration;
  }

  async function rate(key,limit=60,window=60) {
    if(await api('/rest/v1/rpc/loyalty_rate',{p_key:key,p_limit:limit,p_window:window})!==true) throw new PassportFailure(429,'Trop de demandes. Réessaie dans quelques instants.');
  }

  function requireConfiguration(config) {
    if(!config.enabled || !config.configured) throw new PassportFailure(503,'La présentation signée est désactivée ou indisponible.');
  }

  return async req => {
    const origin=req.headers.get('origin')||'';
    const headers={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','Access-Control-Allow-Headers':'authorization,apikey,content-type,x-client-info','Access-Control-Allow-Methods':'GET,POST,OPTIONS','Vary':'Origin',...(origins.has(origin)?{'Access-Control-Allow-Origin':origin}:{})};
    const reply=(body,status=200,publicRead=false)=>Response.json(body,{status,headers:{...headers,...(publicRead?{'Access-Control-Allow-Origin':'*'}:{})}});
    if(req.method==='OPTIONS') return new Response(null,{status:204,headers});
    try {
      if(req.method==='GET') {
        const action=new URL(req.url).searchParams.get('action')||'metadata';
        if(!['jwks','metadata'].includes(action)) throw new PassportFailure(404,'Action inconnue.');
        const ip=(req.headers.get('cf-connecting-ip')||req.headers.get('x-forwarded-for')||'unknown').split(',')[0].trim().slice(0,128);
        await rate('passport-recognition:public:'+await sha256(ip),10,60);
        const config=await configuration();
        if(action==='jwks') return reply({keys:config.material?[config.material.publicJWK]:[]},200,true);
        return reply({profile:'3b-private-recognition-v1',issuer:httpsURL(issuer),algorithm:'ES256',jwks_uri:endpoint+'?action=jwks',verification_endpoint:endpoint,supported_scopes:RECOGNITION_SCOPES,ttl_seconds:PROOF_TTL_SECONDS,online_validation_required:true,one_time:true,official_recognition:false},200,true);
      }
      if(req.method!=='POST') throw new PassportFailure(405,'Méthode non autorisée.');
      if(origin && !origins.has(origin)) throw new PassportFailure(403,'Origine non autorisée.');
      const body=await readPassportBody(req);
      const config=await configuration();
      if(body.action==='verify') {
        fieldSet(body,['action','proof','nonce']);
        requireConfiguration(config);
        if(!isNonce(body.nonce)) throw new PassportFailure(400,'Défi partenaire invalide.');
        const authorization=req.headers.get('authorization')||'';
        const apiKey=authorization.startsWith('Bearer ')?authorization.slice(7):'';
        if(!/^[A-Za-z0-9_-]{32,256}$/.test(apiKey)) throw new PassportFailure(401,'Authentification partenaire requise.');
        const keyHash=await sha256(apiKey);
        const partner=first(await api('/rest/v1/passport_recognition_partners?active=eq.true&api_key_hash=eq.'+keyHash+'&select=id,name,audience,allowed_scopes&limit=1'));
        if(!partner || !httpsURL(partner.audience)) throw new PassportFailure(401,'Partenaire non autorisé.');
        await rate('passport-recognition:verify:'+partner.id,60,60);
        let payload;
        try{payload=await verifyProof(body.proof,config.material,{issuer,audience:partner.audience});}
        catch{throw new PassportFailure(400,'Preuve invalide, expirée ou destinée à un autre partenaire.');}
        const nonceHash=await sha256(body.nonce);
        if(payload.nonce_hash!==nonceHash || payload.scopes.some(scope=>!partner.allowed_scopes.includes(scope))) throw new PassportFailure(403,'Défi ou informations non autorisés pour ce partenaire.');
        const result=first(await api('/rest/v1/rpc/passport_recognition_consume_v1',{p_partner:partner.id,p_nonce_hash:nonceHash,p_payload:payload}));
        if(result?.valid!==true) throw new PassportFailure(400,'Cette preuve n’est plus valide.');
        return reply({valid:true,issuer,audience:partner.audience,subject:payload.sub,proofId:result.proof_id,scopes:result.scopes,claims:result.claims,expiresAt:result.expires_at,oneTime:true});
      }
      const {userId,sessionId}=await authenticate(req);
      await rate(userId+':passport-recognition',60,60);
      if(body.action==='status') {
        fieldSet(body,['action']);
        let partners=[],proofs=[],registryReady=true;
        try {
          const [registered,recent]=await Promise.all([
            api('/rest/v1/passport_recognition_partners?active=eq.true&select=id,name,website,audience,allowed_scopes&order=name.asc&limit=100'),
            api('/rest/v1/passport_recognition_proofs?user_id=eq.'+userId+'&select=id,partner_id,scopes,issued_at,expires_at,revoked_at,consumed_at&order=issued_at.desc&limit=20')
          ]);
          partners=(registered||[]).filter(partner=>httpsURL(partner.website)&&httpsURL(partner.audience)).map(partner=>({id:partner.id,name:partner.name,website:partner.website,scopes:partner.allowed_scopes.filter(scope=>RECOGNITION_SCOPES.includes(scope))}));
          const partnerNames=new Map(partners.map(partner=>[partner.id,partner.name]));
          proofs=(recent||[]).map(proof=>({id:proof.id,partnerId:proof.partner_id,partnerName:partnerNames.get(proof.partner_id)||'Partenaire',scopes:proof.scopes,issuedAt:proof.issued_at,expiresAt:proof.expires_at,revokedAt:proof.revoked_at,consumedAt:proof.consumed_at,status:proof.revoked_at?'revoked':proof.consumed_at?'consumed':new Date(proof.expires_at).getTime()<=Date.now()?'expired':'active'}));
        } catch {registryReady=false;}
        return reply({readiness:{configured:config.configured,enabled:config.enabled,ready:config.configured&&config.enabled&&registryReady&&partners.length>0,hasPartners:partners.length>0,registryReady,algorithm:'ES256',ttlSeconds:PROOF_TTL_SECONDS,issuer:httpsURL(issuer),missing:[...config.missing,...(!registryReady?['partner_registry_unavailable']:partners.length?[]:['no_active_partners'])]},partners,proofs});
      }
      if(body.action==='issue') {
        requireConfiguration(config);
        fieldSet(body,['action','partnerId','scopes','nonce','consent']);
        if(!isUUID(body.partnerId) || !isNonce(body.nonce) || body.consent!==true) throw new PassportFailure(400,'Choisis un partenaire, son défi et les informations à partager, puis confirme ton accord.');
        let scopes;
        try{scopes=scopesFor(body.scopes);}catch{throw new PassportFailure(400,'Informations demandées invalides.');}
        const subject=await pairwiseSubject(config.pairwise,body.partnerId,userId);
        const result=first(await api('/rest/v1/rpc/passport_recognition_issue_v1',{p_user:userId,p_session:sessionId,p_partner:body.partnerId,p_scopes:scopes,p_nonce_hash:await sha256(body.nonce),p_subject:subject,p_issuer:issuer,p_consent:true}));
        if(!result?.payload || !isUUID(result.id)) throw new PassportFailure(503,'La présentation n’a pas pu être créée.');
        const proof=await signProof(result.payload,config.material,{issuer});
        return reply({proof,proofJWT:proof,proofId:result.id,expiresAt:result.expires_at,partnerName:result.partner_name});
      }
      if(body.action==='revoke') {
        fieldSet(body,['action','proofId']);
        if(!isUUID(body.proofId)) throw new PassportFailure(400,'Identifiant de présentation invalide.');
        if(await api('/rest/v1/rpc/passport_recognition_revoke_v1',{p_user:userId,p_session:sessionId,p_proof:body.proofId})!==true) throw new PassportFailure(404,'Cette présentation n’appartient pas à ton compte.');
        return reply({ok:true,proofId:body.proofId});
      }
      throw new PassportFailure(404,'Action inconnue.');
    } catch(error) {
      return reply({error:error instanceof PassportFailure?error.message:'La présentation ne peut pas être vérifiée pour le moment.'},error instanceof PassportFailure?error.status:503);
    }
  };
}
