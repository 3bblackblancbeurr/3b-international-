import {PassportFailure,readPassportBody,passportOrigins} from './passport-recognition-runtime.js';
import {sha256,isUUID} from './passport-recognition.js';

const first=value=>Array.isArray(value)?value[0]:value;
const secret=()=>Array.from(crypto.getRandomValues(new Uint8Array(32)),byte=>byte.toString(16).padStart(2,'0')).join('');
const number=id=>'3B-PASS-'+String(id).toUpperCase();
const noExtra=(body,allowed)=>{if(Object.keys(body).some(key=>!allowed.includes(key)))throw new PassportFailure(400,'Demande invalide.');};

export function createPassportTicketIssuer(runtime,encodeQR) {
  const {api,authenticate,appURL}=runtime,origins=passportOrigins(appURL);
  return async req=>{
    const origin=req.headers.get('origin')||'';
    const headers={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','Access-Control-Allow-Headers':'authorization,apikey,content-type,x-client-info','Access-Control-Allow-Methods':'POST,OPTIONS','Vary':'Origin',...(origins.has(origin)?{'Access-Control-Allow-Origin':origin}:{})};
    const reply=(data,status=200)=>Response.json(data,{status,headers});
    if(req.method==='OPTIONS')return new Response(null,{status:204,headers});
    try {
      if(req.method!=='POST')throw new PassportFailure(405,'Méthode non autorisée.');
      if(origin&&!origins.has(origin))throw new PassportFailure(403,'Origine non autorisée.');
      const body=await readPassportBody(req,8192);
      const {userId,sessionId}=await authenticate(req);
      const action=body.action||'issue';
      if(action==='revoke') {
        noExtra(body,['action','ticketId']);
        if(!isUUID(body.ticketId))throw new PassportFailure(400,'Identifiant de code invalide.');
        if(await api('/rest/v1/rpc/passport_ticket_revoke_v1',{p_user:userId,p_session:sessionId,p_ticket:body.ticketId})!==true)throw new PassportFailure(404,'Ce code n’appartient pas à ton compte.');
        return reply({ok:true,ticketId:body.ticketId});
      }
      if(action!=='issue')throw new PassportFailure(404,'Action inconnue.');
      noExtra(body,['action']);
      const token=secret(),expiresAt=new Date(Date.now()+5*60*1000).toISOString();
      // One SQL transaction locks the member, checks the live session/rate limit,
      // revokes the previous ticket and inserts the new digest.
      const ticket=first(await api('/rest/v1/rpc/passport_ticket_issue_v1',{p_user:userId,p_session:sessionId,p_token_hash:await sha256(token),p_expires_at:expiresAt}));
      if(!isUUID(ticket?.ticket_id)||!isUUID(ticket?.passport_public_id)||ticket.passport_state!=='active')throw new PassportFailure(503,'Ton Passeport ne peut pas être présenté pour le moment.');
      const verifyUrl=appURL+'/passport-verify.html#ticket='+token;
      const qrDataUrl=encodeQR(verifyUrl,'data-url',{ecc:'quartile',scale:6,border:4});
      return reply({ticketId:ticket.ticket_id,verifyUrl,qrDataUrl,expiresAt:ticket.expires_at,passportNumber:number(ticket.passport_public_id),state:ticket.passport_state,version:ticket.passport_version});
    } catch(error) {
      return reply({error:error instanceof PassportFailure?error.message:'Vérification momentanément indisponible.'},error instanceof PassportFailure?error.status:503);
    }
  };
}

export function createPassportTicketVerifier(runtime) {
  const {api}=runtime;
  return async req=>{
    const headers={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'content-type,apikey','Access-Control-Allow-Methods':'POST,OPTIONS','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','Content-Security-Policy':"default-src 'none'; frame-ancestors 'none'"};
    const reply=(data,status=200)=>Response.json(data,{status,headers});
    if(req.method==='OPTIONS')return new Response(null,{status:204,headers});
    try {
      if(req.method!=='POST')throw new PassportFailure(405,'Méthode non autorisée.');
      const body=await readPassportBody(req,8192);
      noExtra(body,['ticket']);
      const token=String(body.ticket||'').trim().toLowerCase();
      if(!/^[0-9a-f]{64}$/.test(token))throw new PassportFailure(400,'Code invalide ou expiré.');
      const ip=(req.headers.get('cf-connecting-ip')||req.headers.get('x-forwarded-for')||'unknown').split(',')[0].trim().slice(0,128);
      if(await api('/rest/v1/rpc/loyalty_rate',{p_key:'passport-verify:'+await sha256(ip),p_limit:30,p_window:60})!==true)throw new PassportFailure(429,'Trop de vérifications. Réessaie dans une minute.');
      // Atomic single use, plus an active live member profile, enforced in SQL.
      const profile=first(await api('/rest/v1/rpc/passport_ticket_consume_v1',{p_token_hash:await sha256(token)}));
      if(!profile||profile.passport_state!=='active'||!isUUID(profile.passport_public_id))throw new PassportFailure(400,'Code invalide ou expiré.');
      const identityVerified=profile.identity_verification_state==='verified'&&['identity_verified','high_assurance'].includes(profile.identity_assurance_level)&&Boolean(profile.identity_verification_provider)&&/^[0-9a-f]{64}$/.test(profile.identity_verification_ref_hash||'')&&Number.isFinite(Date.parse(profile.identity_verified_at))&&Date.parse(profile.identity_verified_at)<=Date.now();
      return reply({valid:true,passport:{number:number(profile.passport_public_id),displayName:String(profile.name||'Membre 3B').slice(0,80),handle:String(profile.handle||'').slice(0,24),country:String(profile.country||'').slice(0,32),state:'active',version:Number(profile.passport_version)||2,issuedAt:profile.passport_issued_at||null,identityVerified,identityAssuranceLevel:identityVerified?profile.identity_assurance_level:profile.identity_assurance_level==='account_verified'?'account_verified':'self_asserted',identityVerifiedAt:identityVerified?profile.identity_verified_at:null,publicBadgeVerified:profile.public_verified===true,title:profile.public_verified===true?String(profile.public_title||'').slice(0,80):''}});
    } catch(error) {
      return reply({valid:false,error:error instanceof PassportFailure?error.message:'Vérification momentanément indisponible.'},error instanceof PassportFailure?error.status:503);
    }
  };
}
