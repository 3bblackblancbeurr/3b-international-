import { createRemoteJWKSet, jwtVerify } from 'jose';

const BASE=Deno.env.get('SUPABASE_URL')!;
const APP_URL=(Deno.env.get('APP_URL')||'https://3b-international.vercel.app').replace(/\/$/,'');
const PROVIDER=(Deno.env.get('PASSPORT_IDENTITY_PROVIDER')||'').trim().toLowerCase();
const ENABLED=Deno.env.get('PASSPORT_IDENTITY_VERIFICATION_ENABLED')==='true';
const IDNOW_APPROVED=Deno.env.get('IDNOW_PVID_FLOW_APPROVED')==='true';
const PHYSICAL=(Deno.env.get('IDNOW_PHYSICAL_ENV')||'sandbox').trim().toLowerCase();
const LOGICAL=(Deno.env.get('IDNOW_LOGICAL_ENV')||'staging').trim().toLowerCase();
const CLIENT_ID=(Deno.env.get('IDNOW_CLIENT_ID')||'').trim();
const CLIENT_SECRET=(Deno.env.get('IDNOW_CLIENT_SECRET')||'').trim();
const FLOW_ID=(Deno.env.get('IDNOW_FLOW_ID')||'').trim();
const WEBHOOK_AUDIENCE=(Deno.env.get('IDNOW_WEBHOOK_AUDIENCE')||'').trim();
const REF_SECRET=(Deno.env.get('PASSPORT_IDENTITY_REFERENCE_SECRET')||'').trim();

function bundledKey(bundleEnv:string,legacyEnv:string){
  const raw=Deno.env.get(bundleEnv);
  if(raw)try{
    const parsed=JSON.parse(raw);
    if(typeof parsed?.default==='string'&&parsed.default)return parsed.default;
    const first=Object.values(parsed||{}).find(value=>typeof value==='string'&&value);
    if(typeof first==='string')return first;
  }catch{}
  return Deno.env.get(legacyEnv)||'';
}

const ADMIN=bundledKey('SUPABASE_SECRET_KEYS','SUPABASE_SERVICE_ROLE_KEY');
const PUBLIC=bundledKey('SUPABASE_PUBLISHABLE_KEYS','SUPABASE_ANON_KEY');
const ORIGINS=new Set([
  APP_URL,'https://localhost','capacitor://localhost',
  'http://localhost:5173','http://127.0.0.1:5173',
  'http://localhost:5174','http://127.0.0.1:5174'
]);

class Failure extends Error{constructor(public status:number,message:string){super(message);}}

const encoder=new TextEncoder();
const hex=(bytes:ArrayBuffer)=>Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,'0')).join('');

async function hmac(value:string){
  if(REF_SECRET.length<32)throw new Failure(503,'Configuration de pseudonymisation incomplète.');
  const key=await crypto.subtle.importKey('raw',encoder.encode(REF_SECRET),{name:'HMAC',hash:'SHA-256'},false,['sign']);
  return hex(await crypto.subtle.sign('HMAC',key,encoder.encode(value)));
}

function adminHeaders(body=false){
  if(!ADMIN)throw new Failure(503,'Configuration serveur incomplète.');
  return{
    apikey:ADMIN,
    ...(ADMIN.startsWith('sb_secret_')?{}:{Authorization:'Bearer '+ADMIN}),
    ...(body?{'Content-Type':'application/json',Prefer:'return=representation'}:{})
  };
}

async function api(path:string,body?:unknown,method=body===undefined?'GET':'POST'){
  const response=await fetch(BASE+path,{
    method,
    headers:adminHeaders(body!==undefined),
    ...(body===undefined?{}:{body:JSON.stringify(body)}),
    signal:AbortSignal.timeout(12000)
  });
  const data=await response.json().catch(()=>null);
  if(!response.ok)throw new Failure(response.status>=500?503:400,'La demande serveur n’a pas abouti.');
  return data;
}

async function authenticate(req:Request){
  if(!PUBLIC)throw new Failure(503,'Configuration d’authentification incomplète.');
  const authorization=req.headers.get('authorization')||'';
  if(!authorization.startsWith('Bearer '))throw new Failure(401,'Connecte-toi à ton compte 3B.');
  const token=authorization.slice(7);
  const response=await fetch(BASE+'/auth/v1/user',{
    headers:{apikey:PUBLIC,Authorization:authorization},
    signal:AbortSignal.timeout(10000)
  });
  const user=await response.json().catch(()=>null);
  if(!response.ok||!user?.id)throw new Failure(401,'Ta session a expiré. Reconnecte-toi.');
  let sid='';
  try{
    const part=token.split('.')[1]||'';
    const normalized=part.replace(/-/g,'+').replace(/_/g,'/');
    sid=String(JSON.parse(atob(normalized)).session_id||'');
  }catch{}
  if(!sid)throw new Failure(401,'Ta session a expiré. Reconnecte-toi.');
  const valid=await api('/rest/v1/rpc/loyalty_session_valid',{p_user:user.id,p_session:sid});
  if(valid!==true)throw new Failure(401,'Ta session a expiré. Reconnecte-toi.');
  return String(user.id);
}

function idnowHosts(){
  if(PHYSICAL==='sandbox')return{
    auth:'https://auth.eu.platform.idnow.sx',
    api:'https://api.eu.platform.idnow.sx',
    jwks:'https://auth.eu.platform.idnow.sx/oidc/.well-known/jwks.json',
    discovery:'https://auth.eu.platform.idnow.sx/oidc/.well-known/openid-configuration'
  };
  if(PHYSICAL==='production')return{
    auth:'https://auth.eu.platform.idnow.io',
    api:'https://api.eu.platform.idnow.io',
    jwks:'https://auth.eu.platform.idnow.io/oidc/.well-known/jwks.json',
    discovery:'https://auth.eu.platform.idnow.io/oidc/.well-known/openid-configuration'
  };
  throw new Failure(503,'Environnement IDnow invalide.');
}

function configured(){
  return ENABLED&&PROVIDER==='idnow'&&
    ['sandbox','production'].includes(PHYSICAL)&&
    ['staging','live'].includes(LOGICAL)&&
    CLIENT_ID.length>3&&CLIENT_SECRET.length>10&&FLOW_ID.length>8&&
    WEBHOOK_AUDIENCE.startsWith('https://')&&REF_SECRET.length>=32;
}

async function idnowToken(){
  if(!configured())throw new Failure(503,'Vérification d’identité non activée.');
  const hosts=idnowHosts();
  const basic=btoa(CLIENT_ID+':'+CLIENT_SECRET);
  const response=await fetch(hosts.auth+'/oidc/token',{
    method:'POST',
    headers:{
      Authorization:'Basic '+basic,
      'Content-Type':'application/x-www-form-urlencoded',
      'User-Agent':'3B-Passport/1.0'
    },
    body:'grant_type=client_credentials',
    signal:AbortSignal.timeout(12000)
  });
  const data=await response.json().catch(()=>null);
  if(!response.ok||!data?.access_token)throw new Failure(503,'Connexion au prestataire d’identité indisponible.');
  return String(data.access_token);
}

async function idnow(path:string,method='GET',body?:unknown){
  const token=await idnowToken(),hosts=idnowHosts();
  const response=await fetch(hosts.api+path,{
    method,
    headers:{
      Authorization:'Bearer '+token,
      Accept:'application/json',
      'User-Agent':'3B-Passport/1.0',
      ...(body===undefined?{}:{'Content-Type':'application/json'})
    },
    ...(body===undefined?{}:{body:JSON.stringify(body)}),
    signal:AbortSignal.timeout(15000)
  });
  const data=await response.json().catch(()=>null);
  if(!response.ok)throw new Failure(response.status>=500?503:400,'Le prestataire d’identité a refusé la demande.');
  return data;
}

async function startVerification(uid:string){
  if(!configured())throw new Failure(503,'La vérification d’identité n’est pas encore ouverte.');
  if(PHYSICAL==='production'&&LOGICAL==='live'&&!IDNOW_APPROVED)
    throw new Failure(503,'Le flux IDnow production n’est pas approuvé.');

  const allowed=await api('/rest/v1/rpc/loyalty_rate',{p_key:uid+':passport-idv',p_limit:3,p_window:3600});
  if(allowed!==true)throw new Failure(429,'Trop de tentatives de vérification. Réessaie plus tard.');

  const profiles=await api('/rest/v1/member_profiles?user_id=eq.'+encodeURIComponent(uid)+
    '&select=passport_public_id,passport_state,identity_verification_state,identity_assurance_level&limit=1');
  const profile=profiles?.[0];
  if(!profile?.passport_public_id||profile.passport_state!=='active')throw new Failure(403,'Passeport 3B actif requis.');
  if(profile.identity_verification_state==='verified')throw new Failure(409,'Cette identité est déjà vérifiée.');

  const claims=await api('/rest/v1/member_identity_claims?user_id=eq.'+encodeURIComponent(uid)+
    '&select=legal_given_names,legal_family_name,birth_date&limit=1');
  const claim=claims?.[0];
  if(!claim?.legal_given_names||!claim?.legal_family_name||!claim?.birth_date)
    throw new Failure(409,'Complète d’abord tes informations d’identité.');

  const subjectId='3b_'+(await hmac('subject:'+uid)).slice(0,40);
  const session=await idnow(
    '/api/v1/flows/'+encodeURIComponent(FLOW_ID)+'/'+LOGICAL+'/sessions',
    'POST',
    {
      input:{
        basicIdentity:{
          givenName:String(claim.legal_given_names).slice(0,120),
          familyName:String(claim.legal_family_name).slice(0,120),
          birthDate:String(claim.birth_date)
        }
      },
      metadata:{subjectId,locale:'fr'}
    }
  );

  const sessionId=String(session?.sessionContext?.sessionId||'');
  const playerUrl=String(session?.playerUrl||'');
  if(!sessionId||!playerUrl.startsWith('https://'))throw new Failure(503,'Session de vérification invalide.');

  const refHash=await hmac('idnow-session:'+sessionId);
  const rows=await api('/rest/v1/passport_identity_verification_attempts',{
    user_id:uid,
    provider:'idnow',
    provider_session_ref_hash:refHash,
    state:'processing',
    assurance_requested:'identity_verified'
  });
  const attempt=Array.isArray(rows)?rows[0]:rows;

  await api('/rest/v1/member_profiles?user_id=eq.'+encodeURIComponent(uid)+
    '&identity_verification_state=in.(unverified,rejected,expired)',
    {identity_verification_state:'pending'},
    'PATCH'
  );

  return{
    attemptId:attempt?.id||null,
    playerUrl,
    environment:PHYSICAL+':'+LOGICAL
  };
}

async function oidcIssuer(){
  const hosts=idnowHosts();
  const response=await fetch(hosts.discovery,{signal:AbortSignal.timeout(8000)});
  const data=await response.json().catch(()=>null);
  if(!response.ok||!data?.issuer)throw new Failure(503,'Clés de vérification IDnow indisponibles.');
  return String(data.issuer);
}

async function verifyWebhook(token:string){
  if(!configured())throw new Failure(503,'Vérification d’identité non activée.');
  const hosts=idnowHosts();
  const issuer=await oidcIssuer();
  const jwks=createRemoteJWKSet(new URL(hosts.jwks));
  const verified=await jwtVerify(token,jwks,{issuer,audience:WEBHOOK_AUDIENCE});
  return verified.payload as Record<string,unknown>;
}

async function processWebhook(jwt:string){
  let payload:Record<string,unknown>;
  try{payload=await verifyWebhook(jwt);}
  catch{throw new Failure(401,'Signature webhook invalide.');}

  const data=(payload.data&&typeof payload.data==='object'?payload.data:{}) as Record<string,unknown>;
  const eventId=String(data.eventId||'');
  const eventName=String(data.eventName||'');
  const eventVersion=String(data.eventVersion||'');
  const eventPayload=(data.payload&&typeof data.payload==='object'?data.payload:{}) as Record<string,unknown>;
  const sessionId=String(eventPayload.sessionId||'');

  if(!/^[0-9a-f-]{16,80}$/i.test(eventId)||!/^session\.(created|completed|aborted|expired|error)$/.test(eventName)||!sessionId)
    throw new Failure(400,'Webhook IDnow invalide.');

  const claimRows=await api('/rest/v1/rpc/passport_identity_provider_event_claim',{
    p_provider:'idnow',
    p_event_id:eventId,
    p_event_name:eventName,
    p_event_version:eventVersion||null
  });
  const claim=Array.isArray(claimRows)?claimRows[0]:claimRows;
  if(claim?.already_processed===true)return{ok:true,duplicate:true};
  if(claim?.in_progress===true)throw new Failure(503,'Événement webhook déjà en cours de traitement.');
  if(claim?.claimed!==true)throw new Failure(503,'Événement webhook non réclamé.');

  const refHash=await hmac('idnow-session:'+sessionId);
  const attempts=await api('/rest/v1/passport_identity_verification_attempts?provider=eq.idnow&provider_session_ref_hash=eq.'+
    refHash+'&select=id,user_id,state&limit=1');
  const attempt=attempts?.[0];
  if(!attempt?.id){
    await api('/rest/v1/passport_identity_provider_events?provider=eq.idnow&event_id=eq.'+encodeURIComponent(eventId),
      {processed_at:new Date().toISOString(),processing_started_at:null,processing_result:'unknown_session'},'PATCH');
    return{ok:true};
  }

  let nextState='processing',resultCode=eventName;
  if(eventName==='session.completed'){
    const result=await idnow('/api/v1/'+LOGICAL+'/sessions/'+encodeURIComponent(sessionId));
    const expected='3b_'+(await hmac('subject:'+attempt.user_id)).slice(0,40);
    if(String(result?.metadata?.subjectId||'')!==expected)throw new Failure(409,'Référence sujet IDnow incohérente.');
    if(String(result?.flowId||'')!==FLOW_ID)throw new Failure(409,'Flux IDnow incohérent.');

    const outcome=String(result?.outcome||'');
    if(outcome==='accepted'&&IDNOW_APPROVED){
      nextState='verified';
      await api('/rest/v1/passport_identity_verification_attempts?id=eq.'+attempt.id,{
        state:'verified',completed_at:new Date().toISOString(),last_error_code:null
      },'PATCH');
      await api('/rest/v1/member_profiles?user_id=eq.'+encodeURIComponent(attempt.user_id),{
        identity_verification_state:'verified',
        identity_assurance_level:'identity_verified',
        identity_verified_at:new Date().toISOString(),
        identity_verification_provider:'idnow',
        identity_verification_ref_hash:refHash
      },'PATCH');
    }else if(outcome==='accepted'){
      nextState='error';resultCode='flow_not_approved';
      await api('/rest/v1/passport_identity_verification_attempts?id=eq.'+attempt.id,{
        state:'error',completed_at:new Date().toISOString(),last_error_code:'flow_not_approved'
      },'PATCH');
    }else{
      nextState='rejected';resultCode='rejected';
      await api('/rest/v1/passport_identity_verification_attempts?id=eq.'+attempt.id,{
        state:'rejected',completed_at:new Date().toISOString(),last_error_code:'provider_rejected'
      },'PATCH');
      await api('/rest/v1/member_profiles?user_id=eq.'+encodeURIComponent(attempt.user_id)+'&identity_verification_state=eq.pending',{
        identity_verification_state:'rejected'
      },'PATCH');
    }
  }else if(eventName==='session.expired'){
    nextState='expired';
    await api('/rest/v1/passport_identity_verification_attempts?id=eq.'+attempt.id,{
      state:'expired',completed_at:new Date().toISOString(),last_error_code:'session_expired'
    },'PATCH');
    await api('/rest/v1/member_profiles?user_id=eq.'+encodeURIComponent(attempt.user_id)+'&identity_verification_state=eq.pending',{
      identity_verification_state:'expired'
    },'PATCH');
  }else if(eventName==='session.aborted'){
    nextState='cancelled';
    await api('/rest/v1/passport_identity_verification_attempts?id=eq.'+attempt.id,{
      state:'cancelled',completed_at:new Date().toISOString(),last_error_code:'session_aborted'
    },'PATCH');
    await api('/rest/v1/member_profiles?user_id=eq.'+encodeURIComponent(attempt.user_id)+'&identity_verification_state=eq.pending',{
      identity_verification_state:'unverified'
    },'PATCH');
  }else if(eventName==='session.error'){
    nextState='error';
    await api('/rest/v1/passport_identity_verification_attempts?id=eq.'+attempt.id,{
      state:'error',completed_at:new Date().toISOString(),last_error_code:'provider_error'
    },'PATCH');
  }

  await api('/rest/v1/passport_identity_provider_events?provider=eq.idnow&event_id=eq.'+encodeURIComponent(eventId),{
    processed_at:new Date().toISOString(),processing_started_at:null,processing_result:resultCode
  },'PATCH');

  return{ok:true,state:nextState};
}

Deno.serve(async req=>{
  const origin=req.headers.get('origin')||'';
  const cors={
    ...(ORIGINS.has(origin)?{'Access-Control-Allow-Origin':origin}:{}),
    'Access-Control-Allow-Headers':'authorization,apikey,content-type,x-client-info',
    'Access-Control-Allow-Methods':'POST,OPTIONS',
    'Cache-Control':'no-store','Vary':'Origin','X-Content-Type-Options':'nosniff'
  };
  const reply=(body:unknown,status=200)=>Response.json(body,{status,headers:cors});
  if(req.method==='OPTIONS')return new Response(null,{status:204,headers:cors});
  if(req.method!=='POST')return reply({error:'Méthode non autorisée.'},405);
  if(origin&&!ORIGINS.has(origin))return reply({error:'Origine non autorisée.'},403);

  try{
    const type=(req.headers.get('content-type')||'').split(';')[0].trim().toLowerCase();
    if(type==='application/jwt'){
      const jwt=(await req.text()).trim();
      if(jwt.length<100||jwt.length>30000)throw new Failure(400,'Webhook invalide.');
      return reply(await processWebhook(jwt));
    }

    if(type!=='application/json')throw new Failure(415,'Format invalide.');
    const uid=await authenticate(req);
    const body=await req.json().catch(()=>null);
    const action=String(body?.action||'');
    if(action==='readiness')return reply({
      enabled:configured(),
      provider:PROVIDER||null,
      physicalEnvironment:PHYSICAL,
      logicalEnvironment:LOGICAL,
      productionFlowApproved:IDNOW_APPROVED
    });
    if(action==='start')return reply(await startVerification(uid),201);
    throw new Failure(404,'Action inconnue.');
  }catch(error){
    return reply(
      {error:error instanceof Failure?error.message:'Service de vérification momentanément indisponible.'},
      error instanceof Failure?error.status:500
    );
  }
});
