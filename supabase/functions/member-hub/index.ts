import {validateAccount,accountEmail,themeFor,GAMES,EXPLORATIONS} from './loyalty.js';
const BASE=Deno.env.get('SUPABASE_URL')!;
const ADMIN=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const PUBLIC=Deno.env.get('SUPABASE_ANON_KEY')!;
const ORIGINS=new Set(['https://3b-international.vercel.app','http://localhost:5174','http://127.0.0.1:5174','http://127.0.0.1:5186','http://127.0.0.1:5187']);
const hash=async(value:string)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value))),b=>b.toString(16).padStart(2,'0')).join('');
const secret=()=>Array.from(crypto.getRandomValues(new Uint8Array(32)),b=>b.toString(16).padStart(2,'0')).join('');
class Failure extends Error {constructor(public status:number,message:string){super(message);}}
async function api(path:string,body?:unknown,method=body===undefined?'GET':'POST',token=ADMIN){
 const response=await fetch(BASE+path,{method,headers:{apikey:token,Authorization:'Bearer '+token,'Content-Type':'application/json',Prefer:'return=representation'},...(body===undefined?{}:{body:JSON.stringify(body)}),signal:AbortSignal.timeout(12000)});
 const data=await response.json().catch(()=>null);
 if(!response.ok)throw new Failure(response.status>=500?503:400,'La demande n’a pas abouti. Vérifie tes informations puis réessaie.');
 return data;
}
const rpc=(name:string,body:unknown)=>api('/rest/v1/rpc/'+name,body);
async function snapshot(uid:string){
 const [profiles,events]=await Promise.all([
 api('/rest/v1/member_profiles?user_id=eq.'+uid+'&select=user_id,handle,name,country,xp,points,theme,created_at'),
 api('/rest/v1/member_ledger?user_id=eq.'+uid+'&select=id,source,label,xp,points,created_at,event_key&order=created_at.desc&limit=80')]);
 if(!profiles?.[0])throw new Failure(404,'Ton compte est en cours de préparation. Réessaie.');
 const profile=profiles[0];profile.theme=themeFor(profile.theme,profile.xp).id;
 return{profile,events};
}
async function authenticate(req:Request){
 const header=req.headers.get('authorization')||'';if(!header.startsWith('Bearer '))throw new Failure(401,'Connecte-toi à ton compte 3B.');
 const token=header.slice(7);
 const response=await fetch(BASE+'/auth/v1/user',{headers:{apikey:PUBLIC,Authorization:header},signal:AbortSignal.timeout(10000)});
 const user=await response.json();if(!response.ok||!user.id)throw new Failure(401,'Ta session a expiré. Reconnecte-toi.');
 let sid;try{sid=JSON.parse(atob(token.split('.')[1].replace(/-/g,'+').replace(/_/g,'/'))).session_id;}catch{}
 if(!sid||!await rpc('loyalty_session_valid',{p_user:user.id,p_session:sid}))throw new Failure(401,'Ta session a expiré. Reconnecte-toi.');
 return user.id;
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
  if(action==='register'||action==='recover'){
   const input=validateAccount(body),ip=(req.headers.get('x-forwarded-for')||'unknown').split(',').at(-1)!.trim();
   if(!await rpc('loyalty_rate',{p_key:await hash(action+':'+ip),p_limit:action==='register'?5:8,p_window:3600}))throw new Failure(429,'Trop de tentatives. Réessaie dans une heure.');
   if(action==='register'){
    const recovery=secret();let user;
    try{user=await api('/auth/v1/admin/users',{email:accountEmail(input.handle),password:input.password,email_confirm:true,user_metadata:{display_name:input.name}});}catch{throw new Failure(409,'Cet identifiant est indisponible. Choisis-en un autre ou connecte-toi.');}
    try{await api('/rest/v1/member_profiles',{user_id:user.id,handle:input.handle,name:input.name,country:input.country,recovery_hash:await hash(recovery)});}catch(error){await api('/auth/v1/admin/users/'+user.id,undefined,'DELETE').catch(()=>{});throw error;}
    return reply({recovery,handle:input.handle});
   }
   const code=String(body.recovery||'').replace(/\s|-/g,'').toLowerCase();if(!/^[a-f0-9]{64}$/.test(code))throw new Failure(400,'Clé de secours invalide.');
   const recovery=secret(),oldHash=await hash(code),newHash=await hash(recovery);
   const uid=await rpc('loyalty_recovery',{p_handle:input.handle,p_old:oldHash,p_new:newHash});
   if(!uid)throw new Failure(400,'Identifiant ou clé de secours incorrect.');
   try{await api('/auth/v1/admin/users/'+uid,{password:input.password},'PUT');}
   catch(error){await rpc('loyalty_recovery',{p_handle:input.handle,p_old:newHash,p_new:oldHash});throw error;}
   // Revoke previous refresh sessions; the API also checks session existence on every request.
   const login=await api('/auth/v1/token?grant_type=password',{email:accountEmail(input.handle),password:input.password},'POST',PUBLIC);
   await fetch(BASE+'/auth/v1/logout?scope=others',{method:'POST',headers:{apikey:PUBLIC,Authorization:'Bearer '+login.access_token}});
   return reply({recovery,session:login});
  }
  const uid=await authenticate(req);
  if(!await rpc('loyalty_rate',{p_key:uid+':requests',p_limit:100,p_window:60}))throw new Failure(429,'Patiente un instant puis réessaie.');
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
 }catch(error){return reply({error:error instanceof Failure?error.message:error instanceof Error&&error.message.startsWith('Choisis')?error.message:'Service momentanément indisponible. Réessaie dans un instant.'},error instanceof Failure?error.status:400);}
});
