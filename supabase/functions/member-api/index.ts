import {themeFor,GAMES,EXPLORATIONS,IDENTITY_CONSENT_VERSION,validateIdentityClaim} from './loyalty.js';
const BASE=Deno.env.get('SUPABASE_URL')!;
const ADMIN=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const PUBLIC=Deno.env.get('SUPABASE_ANON_KEY')!;
const ORIGINS=new Set(['https://localhost','capacitor://localhost','https://3b-international.vercel.app','http://localhost:5173','http://127.0.0.1:5173','http://localhost:5174','http://127.0.0.1:5174','http://127.0.0.1:5186','http://127.0.0.1:5187']);
class Failure extends Error {constructor(public status:number,message:string){super(message);}}
const hash=async(value:string)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value))),b=>b.toString(16).padStart(2,'0')).join('');
function clientIp(req:Request){return(req.headers.get('cf-connecting-ip')||req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()||'unknown').slice(0,128);}
async function api(path:string,body?:unknown,method=body===undefined?'GET':'POST',token=ADMIN){
 const response=await fetch(BASE+path,{method,headers:{apikey:token,Authorization:'Bearer '+token,'Content-Type':'application/json',Prefer:'return=representation'},...(body===undefined?{}:{body:JSON.stringify(body)}),signal:AbortSignal.timeout(12000)});
 const data=await response.json().catch(()=>null);
 if(!response.ok)throw new Failure(response.status>=500?503:400,'La demande n’a pas abouti. Vérifie tes informations puis réessaie.');
 return data;
}
const rpc=(name:string,body:unknown)=>api('/rest/v1/rpc/'+name,body);
async function snapshot(uid:string){
 const [profiles,events,economy,claims,inventory,entitlements]=await Promise.all([
 api('/rest/v1/member_profiles?user_id=eq.'+uid+'&select=user_id,handle,name,country,xp,points,theme,created_at,public_badge_key,public_title,public_verified,passport_public_id,passport_issued_at,passport_version,passport_state,identity_verification_state,identity_assurance_level,identity_verified_at'),
 api('/rest/v1/member_ledger?user_id=eq.'+uid+'&select=id,source,label,xp,points,created_at,event_key&order=created_at.desc&limit=80'),
 rpc('threeb_progress_snapshot_server',{p_user:uid}),
 api('/rest/v1/member_identity_claims?user_id=eq.'+uid+'&select=user_id&limit=1'),
 api('/rest/v1/inventory?user_id=eq.'+uid+'&select=item_code,quantity,acquired_at&order=acquired_at.desc&limit=250'),
 api('/rest/v1/digital_store_entitlements?user_id=eq.'+uid+'&status=eq.active&select=product_code,item_instance_id,granted_at&order=granted_at.desc&limit=250')
 ]);
 if(!profiles?.[0])throw new Failure(404,'Ton compte est en cours de préparation. Réessaie.');
 const profile=profiles[0];
 const authoritativeXp=Number.isFinite(Number(economy?.xp))?Number(economy.xp):Number(profile.xp)||0;
 profile.xp=Math.max(0,authoritativeXp);
 profile.theme=themeFor(profile.theme,profile.xp).id;
 return{
  profile,events,economy,
  inventory:Array.isArray(inventory)?inventory:[],
  entitlements:Array.isArray(entitlements)?entitlements:[],
  identity_claims_complete:Array.isArray(claims)&&claims.length===1
 };
}
async function authenticate(req:Request){
 const header=req.headers.get('authorization')||'';if(!header.startsWith('Bearer '))throw new Failure(401,'Connecte-toi à ton compte 3B.');
 const token=header.slice(7);
 const response=await fetch(BASE+'/auth/v1/user',{headers:{apikey:PUBLIC,Authorization:header},signal:AbortSignal.timeout(10000)});
 const user=await response.json();if(!response.ok||!user.id)throw new Failure(401,'Ta session a expiré. Reconnecte-toi.');
 let sid;try{sid=JSON.parse(atob(token.split('.')[1].replace(/-/g,'+').replace(/_/g,'/'))).session_id;}catch{}
 if(!sid||!await rpc('loyalty_session_valid',{p_user:user.id,p_session:sid}))throw new Failure(401,'Ta session a expiré. Reconnecte-toi.');
 return user;
}
async function markAccountVerified(user:any){
 if(!user?.id||(!user.email_confirmed_at&&!user.phone_confirmed_at))return;
 await api(
  '/rest/v1/member_profiles?user_id=eq.'+encodeURIComponent(user.id)+'&identity_verification_state=eq.unverified&identity_assurance_level=eq.self_asserted',
  {identity_assurance_level:'account_verified'},
  'PATCH'
 ).catch(()=>{});
}
Deno.serve(async req=>{
 const origin=req.headers.get('origin')||'';
 const cors={...(ORIGINS.has(origin)?{'Access-Control-Allow-Origin':origin}:{}),'Access-Control-Allow-Headers':'authorization,apikey,content-type,x-client-info','Access-Control-Allow-Methods':'POST,OPTIONS','Vary':'Origin','Cache-Control':'no-store'};
 const reply=(body:unknown,status=200)=>Response.json(body,{status,headers:cors});
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers:cors});
 if(req.method!=='POST')return reply({error:'Méthode non autorisée.'},405);
 if(origin&&!ORIGINS.has(origin))return reply({error:'Origine non autorisée.'},403);
 try{
  if(!req.headers.get('content-type')?.startsWith('application/json'))throw new Failure(415,'Format invalide.');
  if(Number(req.headers.get('content-length'))>8192)throw new Failure(413,'Demande trop volumineuse.');
  const reader=req.body?.getReader(),decoder=new TextDecoder();let text='',bytes=0;
  if(reader)try{while(true){const chunk=await reader.read();if(chunk.done)break;bytes+=chunk.value.byteLength;if(bytes>8192){await reader.cancel();throw new Failure(413,'Demande trop volumineuse.');}text+=decoder.decode(chunk.value,{stream:true});}text+=decoder.decode();}finally{reader.releaseLock();}
  let body;try{body=JSON.parse(text);}catch{throw new Failure(400,'Demande invalide.');}
  if(!body||typeof body!=='object')throw new Failure(400,'Demande invalide.');
  const action=body.action;
  if(action==='register'||action==='recover')throw new Failure(404,'Utilise le service d’authentification 3B.');
  const user=await authenticate(req);
  await markAccountVerified(user);
  const uid=user.id;
  if(!await rpc('loyalty_rate',{p_key:uid+':requests',p_limit:100,p_window:60}))throw new Failure(429,'Patiente un instant puis réessaie.');
  if(action==='identity-claim'){
   const input=validateIdentityClaim(body);
   const rows=await api('/rest/v1/member_profiles?user_id=eq.'+uid+'&select=identity_verification_state,identity_assurance_level&limit=1');
   const profile=rows?.[0];
   if(!profile)throw new Failure(404,'Ton compte est en cours de préparation.');
   if(['pending','verified'].includes(String(profile.identity_verification_state)))
    throw new Failure(409,'Ton identité ne peut pas être modifiée pendant ou après une vérification validée.');
   if(profile.identity_verification_state==='revoked')
    throw new Failure(403,'Ce dossier d’identité nécessite une vérification par le support 3B.');

   const existing=await api('/rest/v1/member_identity_claims?user_id=eq.'+uid+'&select=user_id&limit=1');
   const claim={
    legal_given_names:input.legalGivenNames,
    legal_family_name:input.legalFamilyName,
    birth_date:input.birthDate,
    updated_at:new Date().toISOString()
   };
   if(existing?.length)await api('/rest/v1/member_identity_claims?user_id=eq.'+uid,claim,'PATCH');
   else await api('/rest/v1/member_identity_claims',{user_id:uid,...claim,claim_version:1});

   if(['rejected','expired'].includes(String(profile.identity_verification_state))){
    await api('/rest/v1/member_profiles?user_id=eq.'+uid,{
     identity_verification_state:'unverified',
     identity_verified_at:null,
     identity_verification_provider:null,
     identity_verification_ref_hash:null,
     identity_assurance_level:profile.identity_assurance_level==='self_asserted'?'self_asserted':'account_verified'
    },'PATCH');
   }

   await api('/rest/v1/member_consents',{
    user_id:uid,kind:'identity',version:IDENTITY_CONSENT_VERSION,granted:true,
    ip_hash:await hash('identity-claim:'+clientIp(req))
   });
   return reply(await snapshot(uid));
  }
  if(action==='prestige'){
   if(!await rpc('loyalty_rate',{p_key:uid+':prestige',p_limit:5,p_window:3600}))throw new Failure(429,'Patiente avant de réessayer.');
   const current=await snapshot(uid);
   const next=Number(current?.economy?.next_prestige_level||0);
   if(current?.economy?.prestige_eligible!==true||next<1||next>3)throw new Failure(403,'Les conditions du prochain Prestige ne sont pas encore remplies.');
   const prestige=await rpc('threeb_unlock_prestige_server',{p_user:uid,p_event_id:'prestige:'+next+':v1'});
   return reply({prestige,...await snapshot(uid)});
  }
  if(action==='snapshot')return reply(await snapshot(uid));
  if(action==='daily'||action==='explore'){
   const kind=action==='daily'?'daily':body.page;if(action==='explore'&&!Object.hasOwn(EXPLORATIONS,kind))throw new Failure(400,'Découverte inconnue.');
   const awarded=await rpc('loyalty_mission',{p_user:uid,p_kind:kind});return reply({awarded,...await snapshot(uid)});
  }
  if(action==='start'){
   if(!GAMES.includes(body.game))throw new Failure(400,'Jeu inconnu.');
   if(!await rpc('loyalty_rate',{p_key:uid+':start',p_limit:12,p_window:60}))throw new Failure(429,'Patiente avant de relancer une partie.');
   return reply({run:await rpc('loyalty_start_game',{p_user:uid,p_game:body.game})});
  }
  if(action==='heartbeat'){
   if(!/^[a-f0-9-]{36}$/.test(body.run||'')||!Number.isInteger(body.seq)||body.seq<1||body.seq>1000000)throw new Failure(400,'Partie invalide.');
   const gained=await rpc('loyalty_game_beat',{p_user:uid,p_run:body.run,p_seq:body.seq});return reply({gained,...await snapshot(uid)});
  }
  if(action==='end'){
   if(!/^[a-f0-9-]{36}$/.test(body.run||''))throw new Failure(400,'Partie invalide.');
   await api('/rest/v1/member_game_runs?id=eq.'+body.run+'&user_id=eq.'+uid,{ended:true},'PATCH');return reply({ok:true});
  }
  if(action==='theme'){
   const {profile}=await snapshot(uid),theme=themeFor(body.theme,profile.xp);if(theme.id!==body.theme)throw new Failure(403,'Cette carte se débloque avec ta progression.');
   await api('/rest/v1/member_profiles?user_id=eq.'+uid,{theme:theme.id},'PATCH');return reply(await snapshot(uid));
  }
  throw new Failure(400,'Action inconnue.');
 }catch(error){return reply({error:error instanceof Failure?error.message:error instanceof Error&&/^(Choisis|Entre|Accepte)/.test(error.message)?error.message:'Service momentanément indisponible. Réessaie dans un instant.'},error instanceof Failure?error.status:400);}
});
