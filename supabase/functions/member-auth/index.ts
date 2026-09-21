import {
  ACCOUNT_TERMS_VERSION,
  accountEmail,
  normalizeEmail,
  validateAccount,
  validateLogin,
  validateRegistration,
  validateStrongPassword
} from './loyalty.js';

const BASE=Deno.env.get('SUPABASE_URL')!;
const APP_URL=(Deno.env.get('APP_URL')||'https://3b-international.vercel.app').replace(/\/$/,'');
const CAPTCHA_REQUIRED=Deno.env.get('MEMBER_CAPTCHA_REQUIRED')==='true';

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
 APP_URL,
 'https://localhost',
 'capacitor://localhost',
 'http://localhost:5173',
 'http://127.0.0.1:5173',
 'http://localhost:5174',
 'http://127.0.0.1:5174'
]);

class Failure extends Error{constructor(public status:number,message:string){super(message);}}
const hash=async(value:string)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value))),b=>b.toString(16).padStart(2,'0')).join('');
const secret=()=>Array.from(crypto.getRandomValues(new Uint8Array(32)),b=>b.toString(16).padStart(2,'0')).join('');

function adminHeaders(body=false){
 if(!ADMIN)throw new Failure(503,'Configuration serveur incomplète.');
 return{
  apikey:ADMIN,
  ...(ADMIN.startsWith('sb_secret_')?{}:{Authorization:'Bearer '+ADMIN}),
  ...(body?{'Content-Type':'application/json',Prefer:'return=representation'}:{})
 };
}
function publicHeaders(){
 if(!PUBLIC)throw new Failure(503,'Configuration d’authentification incomplète.');
 return{apikey:PUBLIC,'Content-Type':'application/json'};
}
async function api(path:string,body?:unknown,method=body===undefined?'GET':'POST'){
 const response=await fetch(BASE+path,{
  method,
  headers:adminHeaders(body!==undefined),
  ...(body===undefined?{}:{body:JSON.stringify(body)}),
  signal:AbortSignal.timeout(12000)
 });
 const data=await response.json().catch(()=>null);
 if(!response.ok)throw new Failure(response.status>=500?503:400,'La demande n’a pas abouti.');
 return data;
}
async function authApi(path:string,body:unknown){
 const response=await fetch(BASE+path,{
  method:'POST',
  headers:publicHeaders(),
  body:JSON.stringify(body),
  signal:AbortSignal.timeout(12000)
 });
 const data=await response.json().catch(()=>null);
 return{ok:response.ok,status:response.status,data};
}
const rpc=(name:string,body:unknown)=>api('/rest/v1/rpc/'+name,body);

async function loadSettings(){
 const rows=await api('/rest/v1/member_auth_settings?singleton=eq.true&select=allow_legacy_flows&limit=1');
 return{allowLegacy:rows?.[0]?.allow_legacy_flows===true};
}
function clientIp(req:Request){
 return(req.headers.get('cf-connecting-ip')||req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()||'unknown').slice(0,128);
}
function captchaToken(body:any){
 const token=typeof body?.captchaToken==='string'?body.captchaToken.slice(0,4096):'';
 if(CAPTCHA_REQUIRED&&!token)throw new Failure(400,'Vérification anti-robot requise.');
 return token;
}
function captchaBody(token:string){
 return token?{gotrue_meta_security:{captcha_token:token}}:{};
}
async function audit(event_type:string,success:boolean,ipHash:string,user_id:string|null=null,detail:Record<string,unknown>={}){
 await api('/rest/v1/member_auth_events',{event_type,success,ip_hash:ipHash,user_id,detail}).catch(()=>{});
}
async function readJson(req:Request){
 if(!req.headers.get('content-type')?.startsWith('application/json'))throw new Failure(415,'Format invalide.');
 const reader=req.body?.getReader(),decoder=new TextDecoder();let text='',bytes=0;
 if(reader)try{
  while(true){
   const chunk=await reader.read();if(chunk.done)break;
   bytes+=chunk.value.byteLength;
   if(bytes>12288){await reader.cancel();throw new Failure(413,'Demande trop volumineuse.');}
   text+=decoder.decode(chunk.value,{stream:true});
  }
  text+=decoder.decode();
 }finally{reader.releaseLock();}
 try{return JSON.parse(text);}catch{throw new Failure(400,'Demande invalide.');}
}
async function resolveLoginEmail(identifier:string,isEmail:boolean){
 if(isEmail)return{email:normalizeEmail(identifier),uid:null as string|null};
 const rows=await api('/rest/v1/member_profiles?handle=eq.'+encodeURIComponent(identifier)+'&select=user_id&limit=1');
 const uid=rows?.[0]?.user_id as string|undefined;
 if(!uid)return{email:'missing-user@accounts.3b.invalid',uid:null};
 try{
  const user=await api('/auth/v1/admin/users/'+uid);
  return{email:String(user?.email||accountEmail(identifier)),uid};
 }catch{
  return{email:accountEmail(identifier),uid};
 }
}

async function legacyRegister(body:any,ipHash:string){
 const settings=await loadSettings();
 if(!settings.allowLegacy)throw new Failure(426,'Cette version de l’application doit être mise à jour avant de créer un compte.');
 const input=validateAccount(body);
 const recovery=secret();let user;
 try{
  user=await api('/auth/v1/admin/users',{
   email:accountEmail(input.handle),
   password:input.password,
   email_confirm:true,
   user_metadata:{display_name:input.name}
  });
 }catch{
  throw new Failure(409,'Cet identifiant est indisponible. Choisis-en un autre ou connecte-toi.');
 }
 try{
  await api('/rest/v1/member_profiles',{
   user_id:user.id,handle:input.handle,name:input.name,country:input.country,
   recovery_hash:await hash(recovery),registration_version:1
  });
 }catch(error){
  await api('/auth/v1/admin/users/'+user.id,undefined,'DELETE').catch(()=>{});
  throw error;
 }
 await audit('register.legacy_created',true,ipHash,user.id,{});
 return{recovery,handle:input.handle,legacy:true};
}

async function legacyRecover(body:any,ipHash:string){
 const settings=await loadSettings();
 if(!settings.allowLegacy)throw new Failure(426,'Cette version de l’application doit être mise à jour avant de récupérer un compte.');
 const input=validateAccount(body);
 const code=String(body.recovery||'').replace(/\s|-/g,'').toLowerCase();
 if(!/^[a-f0-9]{64}$/.test(code))throw new Failure(400,'Clé de secours invalide.');
 const recovery=secret(),oldHash=await hash(code),newHash=await hash(recovery);
 const uid=await rpc('loyalty_recovery',{p_handle:input.handle,p_old:oldHash,p_new:newHash});
 if(!uid)throw new Failure(400,'Identifiant ou clé de secours incorrect.');
 try{await api('/auth/v1/admin/users/'+uid,{password:input.password},'PUT');}
 catch(error){
  await rpc('loyalty_recovery',{p_handle:input.handle,p_old:newHash,p_new:oldHash});
  throw error;
 }
 const user=await api('/auth/v1/admin/users/'+uid);
 const login=await authApi('/auth/v1/token?grant_type=password',{email:user.email,password:input.password});
 if(!login.ok||!login.data?.access_token)throw new Failure(503,'Mot de passe remplacé. Reconnecte-toi.');
 await fetch(BASE+'/auth/v1/logout?scope=others',{method:'POST',headers:{apikey:PUBLIC,Authorization:'Bearer '+login.data.access_token}}).catch(()=>{});
 await audit('recovery_key.legacy_success',true,ipHash,uid,{});
 return{recovery,session:login.data,legacy:true};
}

Deno.serve(async req=>{
 const origin=req.headers.get('origin')||'';
 const cors={
  ...(ORIGINS.has(origin)?{'Access-Control-Allow-Origin':origin}:{}),
  'Access-Control-Allow-Headers':'apikey,content-type,x-client-info',
  'Access-Control-Allow-Methods':'POST,OPTIONS',
  'Vary':'Origin',
  'Cache-Control':'no-store',
  'X-Content-Type-Options':'nosniff'
 };
 const reply=(body:unknown,status=200)=>Response.json(body,{status,headers:cors});
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers:cors});
 if(req.method!=='POST')return reply({error:'Méthode non autorisée.'},405);
 if(origin&&!ORIGINS.has(origin))return reply({error:'Origine non autorisée.'},403);

 try{
  const body=await readJson(req);
  if(!body||typeof body!=='object'||Array.isArray(body))throw new Failure(400,'Demande invalide.');
  const action=body.action;
  const allowed=['register','register-v2','login','recover','recover-v2','reset-request','resend-confirmation'];
  if(!allowed.includes(action))throw new Failure(404,'Action publique inconnue.');

  const ipHash=await hash(action+':'+clientIp(req));
  const limits:Record<string,number>={
   register:5,'register-v2':5,login:12,recover:8,'recover-v2':8,'reset-request':5,'resend-confirmation':5
  };
  if(!await rpc('loyalty_rate',{p_key:ipHash,p_limit:limits[action]||5,p_window:3600}))
   throw new Failure(429,'Trop de tentatives. Réessaie plus tard.');

  if(action==='register')return reply(await legacyRegister(body,ipHash),201);
  if(action==='recover')return reply(await legacyRecover(body,ipHash));

  const cap=captchaToken(body);

  if(action==='register-v2'){
   const input=validateRegistration(body);
   const identifierHash=await hash('register:'+input.email);
   if(!await rpc('loyalty_rate',{p_key:identifierHash,p_limit:3,p_window:3600}))
    throw new Failure(429,'Trop de tentatives pour cette adresse. Réessaie plus tard.');

   const handleRows=await api('/rest/v1/member_profiles?handle=eq.'+encodeURIComponent(input.handle)+'&select=user_id&limit=1');
   if(handleRows?.length){
    await audit('register.handle_unavailable',false,ipHash,null,{});
    throw new Failure(409,'Cet identifiant 3B est indisponible. Choisis-en un autre.');
   }

   const signup=await authApi(
    '/auth/v1/signup?redirect_to='+encodeURIComponent(APP_URL+'/?auth=confirmed'),
    {
     email:input.email,
     password:input.password,
     data:{display_name:input.name,handle:input.handle,registration_version:2},
     ...captchaBody(cap)
    }
   );

   const user=signup.data?.user;
   if(!signup.ok||!user?.id||(Array.isArray(user.identities)&&user.identities.length===0)){
    await audit('register.rejected',false,ipHash,null,{status:signup.status});
    if(signup.status===429)throw new Failure(429,'Trop de tentatives. Réessaie plus tard.');
    throw new Failure(409,'Impossible de créer ce compte avec ces informations. Vérifie l’adresse ou connecte-toi si tu as déjà un compte.');
   }

   const recovery=secret(),now=new Date().toISOString();
   try{
    await api('/rest/v1/member_profiles',{
     user_id:user.id,
     handle:input.handle,
     name:input.name,
     country:input.country,
     recovery_hash:await hash(recovery),
     registration_version:2,
     terms_accepted_at:now,
     privacy_accepted_at:now,
     marketing_opt_in:input.marketingOptIn,
     last_login_at:signup.data?.session?now:null
    });
    await api('/rest/v1/member_consents',[
     {user_id:user.id,kind:'terms',version:ACCOUNT_TERMS_VERSION,granted:true,ip_hash:ipHash},
     {user_id:user.id,kind:'privacy',version:ACCOUNT_TERMS_VERSION,granted:true,ip_hash:ipHash},
     {user_id:user.id,kind:'marketing',version:ACCOUNT_TERMS_VERSION,granted:input.marketingOptIn,ip_hash:ipHash}
    ]);
   }catch(error){
    await api('/auth/v1/admin/users/'+user.id,undefined,'DELETE').catch(()=>{});
    throw error;
   }

   await audit('register.created',true,ipHash,user.id,{confirmation_required:!signup.data?.session});
   return reply({
    recovery,
    handle:input.handle,
    session:signup.data?.session||null,
    email_confirmation_required:!signup.data?.session
   },201);
  }

  if(action==='login'){
   const input=validateLogin(body);
   const identifierKey=await hash('login:'+input.identifier);
   if(!await rpc('loyalty_rate',{p_key:identifierKey,p_limit:8,p_window:900}))
    throw new Failure(429,'Trop de tentatives. Patiente avant de réessayer.');

   const resolved=await resolveLoginEmail(input.identifier,input.isEmail);
   const login=await authApi('/auth/v1/token?grant_type=password',{
    email:resolved.email,
    password:input.password,
    ...captchaBody(cap)
   });
   const uid=login.data?.user?.id||resolved.uid;
   if(!login.ok||!login.data?.access_token){
    await audit('login.failed',false,ipHash,uid||null,{});
    if(login.status===429)throw new Failure(429,'Trop de tentatives. Patiente avant de réessayer.');
    throw new Failure(401,'Identifiant/e-mail ou mot de passe incorrect.');
   }
   await api('/rest/v1/member_profiles?user_id=eq.'+encodeURIComponent(login.data.user.id),{last_login_at:new Date().toISOString()},'PATCH').catch(()=>{});
   await audit('login.success',true,ipHash,login.data.user.id,{});
   return reply({session:login.data});
  }

  if(action==='recover-v2'){
   const input=validateAccount(body);
   validateStrongPassword(input.password);
   if(input.password!==body.passwordConfirm)throw new Failure(400,'Les deux mots de passe ne correspondent pas.');
   const code=String(body.recovery||'').replace(/\s|-/g,'').toLowerCase();
   if(!/^[a-f0-9]{64}$/.test(code))throw new Failure(400,'Clé de secours invalide.');

   const recovery=secret(),oldHash=await hash(code),newHash=await hash(recovery);
   const uid=await rpc('loyalty_recovery',{p_handle:input.handle,p_old:oldHash,p_new:newHash});
   if(!uid){
    await audit('recovery_key.failed',false,ipHash,null,{});
    throw new Failure(400,'Identifiant ou clé de secours incorrect.');
   }

   const user=await api('/auth/v1/admin/users/'+uid);
   try{
    await api('/auth/v1/admin/users/'+uid,{password:input.password},'PUT');
   }catch(error){
    await rpc('loyalty_recovery',{p_handle:input.handle,p_old:newHash,p_new:oldHash});
    throw error;
   }
   const login=await authApi('/auth/v1/token?grant_type=password',{email:user.email,password:input.password,...captchaBody(cap)});
   if(!login.ok||!login.data?.access_token)throw new Failure(503,'Mot de passe remplacé. Reconnecte-toi.');
   await fetch(BASE+'/auth/v1/logout?scope=others',{method:'POST',headers:{apikey:PUBLIC,Authorization:'Bearer '+login.data.access_token}}).catch(()=>{});
   await api('/rest/v1/member_profiles?user_id=eq.'+encodeURIComponent(uid),{
    password_updated_at:new Date().toISOString(),
    last_login_at:new Date().toISOString()
   },'PATCH').catch(()=>{});
   await audit('recovery_key.success',true,ipHash,uid,{});
   return reply({recovery,session:login.data});
  }

  if(action==='reset-request'){
   const email=normalizeEmail(body.email);
   const emailKey=await hash('reset:'+email);
   if(!await rpc('loyalty_rate',{p_key:emailKey,p_limit:3,p_window:3600}))
    throw new Failure(429,'Trop de demandes. Réessaie plus tard.');
   const result=await authApi(
    '/auth/v1/recover?redirect_to='+encodeURIComponent(APP_URL+'/?reset=1'),
    {email,...captchaBody(cap)}
   );
   await audit('recovery_email.requested',result.ok,ipHash,null,{});
   if(result.status===429)throw new Failure(429,'Trop de demandes. Réessaie plus tard.');
   return reply({ok:true,message:'Si cette adresse correspond à un compte 3B, un message de récupération a été envoyé.'});
  }

  const email=normalizeEmail(body.email);
  const emailKey=await hash('resend:'+email);
  if(!await rpc('loyalty_rate',{p_key:emailKey,p_limit:3,p_window:3600}))
   throw new Failure(429,'Trop de demandes. Réessaie plus tard.');
  const resend=await authApi(
   '/auth/v1/resend?redirect_to='+encodeURIComponent(APP_URL+'/?auth=confirmed'),
   {type:'signup',email,...captchaBody(cap)}
  );
  await audit('confirmation.resent',resend.ok,ipHash,null,{});
  if(resend.status===429)throw new Failure(429,'Trop de demandes. Réessaie plus tard.');
  return reply({ok:true,message:'Si cette adresse attend une confirmation, un nouveau message a été envoyé.'});

 }catch(error){
  const message=error instanceof Failure?error.message:error instanceof Error?error.message:'Service momentanément indisponible.';
  const safeValidation=/^(Choisis|Entre|Le mot de passe|Les deux|Accepte|Utilise|Inscription refusée)/.test(message);
  return reply(
   {error:error instanceof Failure?message:safeValidation?message:'Service momentanément indisponible. Réessaie dans un instant.'},
   error instanceof Failure?error.status:400
  );
 }
});
