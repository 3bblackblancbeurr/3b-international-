const BASE=Deno.env.get('SUPABASE_URL')||'';

class Failure extends Error{constructor(public status:number,message:string){super(message);}}

function bundledKey(bundleEnv:string,legacyEnv:string){
 const raw=Deno.env.get(bundleEnv);
 if(raw)try{
  const parsed=JSON.parse(raw);
  if(typeof parsed?.default==='string'&&parsed.default)return parsed.default;
  const first=Object.values(parsed||{}).find(v=>typeof v==='string'&&v);
  if(typeof first==='string')return first;
 }catch{}
 return Deno.env.get(legacyEnv)||'';
}

const ADMIN=bundledKey('SUPABASE_SECRET_KEYS','SUPABASE_SERVICE_ROLE_KEY');
const PUBLIC=bundledKey('SUPABASE_PUBLISHABLE_KEYS','SUPABASE_ANON_KEY');
const COMMANDS=new Set([
 'ping','system_status','open_3b','open_repo','open_unreal',
 'unreal_health','open_github','open_supabase'
]);

function adminHeaders(body=false){
 if(!ADMIN)throw new Failure(503,'Configuration serveur incomplète.');
 return{
  apikey:ADMIN,
  ...(ADMIN.startsWith('sb_secret_')?{}:{Authorization:'Bearer '+ADMIN}),
  ...(body?{'Content-Type':'application/json',Prefer:'return=representation'}:{})
 };
}
async function adminApi(path:string,init:RequestInit={}){
 const response=await fetch(BASE+path,{
  ...init,
  headers:{...adminHeaders(init.body!==undefined),...(init.headers||{})},
  signal:init.signal||AbortSignal.timeout(12000)
 });
 const text=await response.text();
 let data:any=null;
 try{data=text?JSON.parse(text):null;}catch{data=text;}
 if(!response.ok)throw new Failure(response.status>=500?503:400,'Centre de commande indisponible.');
 return data;
}
async function sha256(value:string){
 const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value));
 return[...new Uint8Array(digest)].map(b=>b.toString(16).padStart(2,'0')).join('');
}
function jwtPayload(token:string){
 try{
  const raw=token.split('.')[1].replace(/-/g,'+').replace(/_/g,'/');
  const padded=raw+'='.repeat((4-raw.length%4)%4);
  return JSON.parse(atob(padded));
 }catch{return null;}
}
async function authenticateOwner(req:Request){
 const auth=req.headers.get('authorization')||'';
 if(!auth.startsWith('Bearer '))throw new Failure(401,'Connexion requise.');
 if(!PUBLIC)throw new Failure(503,'Clé publique absente.');

 const response=await fetch(BASE+'/auth/v1/user',{
  headers:{apikey:PUBLIC,Authorization:auth},
  signal:AbortSignal.timeout(10000)
 });
 const user=await response.json().catch(()=>null);
 if(!response.ok||!user?.id)throw new Failure(401,'Session invalide.');

 const token=auth.slice(7),payload=jwtPayload(token),sid=payload?.session_id;
 if(!sid)throw new Failure(401,'Session invalide.');
 const valid=await adminApi('/rest/v1/rpc/loyalty_session_valid',{
  method:'POST',body:JSON.stringify({p_user:user.id,p_session:sid})
 });
 if(valid!==true)throw new Failure(401,'Session expirée.');

 const settings=await adminApi('/rest/v1/control_center_settings?singleton=eq.true&select=enabled,owner_email,owner_user_id,max_devices,pairing_ttl_seconds&limit=1');
 const current=settings?.[0];
 if(!current?.enabled)throw new Failure(503,'Centre de commande désactivé.');
 const ownerUserId=String(current.owner_user_id||'').trim();
 const ownerEmail=String(current.owner_email||'').trim().toLowerCase();
 const email=String(user.email||'').trim().toLowerCase();
 if(ownerUserId){
  if(user.id!==ownerUserId)throw new Failure(403,'Centre de commande réservé au propriétaire 3B.');
 }else{
  if(!ownerEmail||email!==ownerEmail)throw new Failure(403,'Centre de commande réservé au propriétaire 3B.');
 }
 if(!user.email_confirmed_at)throw new Failure(403,'Confirme ton adresse e-mail avant d’utiliser le Centre de commande.');
 return{uid:user.id as string,settings:current};
}
function pairingCode(){
 const alphabet='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
 const bytes=crypto.getRandomValues(new Uint8Array(10));
 return[...bytes].map(b=>alphabet[b%alphabet.length]).join('');
}
function safeObject(value:unknown,max=4096){
 if(!value||typeof value!=='object'||Array.isArray(value))return{};
 const text=JSON.stringify(value);
 if(new TextEncoder().encode(text).byteLength>max)throw new Failure(413,'Données trop volumineuses.');
 return value;
}
async function audit(uid:string,event_type:string,device_id:string|null=null,detail:Record<string,unknown>={}){
 await adminApi('/rest/v1/control_center_events',{
  method:'POST',
  body:JSON.stringify({user_id:uid,device_id,event_type,detail})
 }).catch(()=>{});
}

const ORIGINS=new Set([
 'https://3b-international.vercel.app',
 'capacitor://localhost',
 'https://localhost',
 'http://localhost:5173',
 'http://127.0.0.1:5173'
]);

Deno.serve(async(req:Request)=>{
 const origin=req.headers.get('origin')||'';
 const cors={
  ...(ORIGINS.has(origin)?{'Access-Control-Allow-Origin':origin}:{}),
  'Access-Control-Allow-Headers':'authorization,apikey,content-type,x-client-info',
  'Access-Control-Allow-Methods':'POST,OPTIONS',
  'Cache-Control':'no-store',
  'Vary':'Origin'
 };
 const reply=(body:unknown,status=200)=>Response.json(body,{status,headers:cors});
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers:cors});
 if(origin&&!ORIGINS.has(origin))return reply({error:'Origine non autorisée.'},403);
 if(req.method!=='POST')return reply({error:'Méthode non autorisée.'},405);

 try{
  const{uid,settings}=await authenticateOwner(req);
  const body=await req.json().catch(()=>{throw new Failure(400,'JSON invalide.');});
  const action=String(body?.action||'status');

  if(action==='status'){
   const [devices,commands,events]=await Promise.all([
    adminApi('/rest/v1/control_center_devices?user_id=eq.'+encodeURIComponent(uid)+'&select=id,name,platform,agent_version,capabilities,paired_at,last_seen_at,revoked_at&order=created_at.desc'),
    adminApi('/rest/v1/control_center_commands?user_id=eq.'+encodeURIComponent(uid)+'&select=id,device_id,command_type,status,issued_at,claimed_at,completed_at,result,error_message&order=issued_at.desc&limit=30'),
    adminApi('/rest/v1/control_center_events?user_id=eq.'+encodeURIComponent(uid)+'&select=id,device_id,event_type,detail,created_at&order=created_at.desc&limit=40')
   ]);
   return reply({
    ok:true,
    server_time:new Date().toISOString(),
    max_devices:settings.max_devices,
    pairing_ttl_seconds:settings.pairing_ttl_seconds,
    devices,
    commands,
    events,
    allowed_commands:[...COMMANDS]
   });
  }

  const rate=await adminApi('/rest/v1/rpc/loyalty_rate',{
   method:'POST',body:JSON.stringify({p_key:uid+':control-center:'+action,p_limit:20,p_window:60})
  });
  if(rate!==true)throw new Failure(429,'Trop de commandes. Patiente un instant.');

  if(action==='create-pairing'){
   await adminApi('/rest/v1/control_center_pairings?user_id=eq.'+encodeURIComponent(uid)+'&used_at=is.null',{
    method:'PATCH',body:JSON.stringify({used_at:new Date().toISOString()})
   }).catch(()=>{});
   const code=pairingCode(),codeHash=await sha256(code);
   const ttl=Math.max(120,Math.min(1800,Number(settings.pairing_ttl_seconds)||600));
   const expires=new Date(Date.now()+ttl*1000).toISOString();
   await adminApi('/rest/v1/control_center_pairings',{
    method:'POST',body:JSON.stringify({user_id:uid,code_hash:codeHash,expires_at:expires})
   });
   await audit(uid,'pairing.created',null,{expires_at:expires});
   return reply({ok:true,code,expires_at:expires});
  }

  if(action==='issue'){
   const deviceId=String(body?.device_id||'');
   const command=String(body?.command_type||'');
   if(!/^[0-9a-f-]{36}$/i.test(deviceId))throw new Failure(400,'Appareil invalide.');
   if(!COMMANDS.has(command))throw new Failure(400,'Commande non autorisée.');
   const device=await adminApi('/rest/v1/control_center_devices?id=eq.'+encodeURIComponent(deviceId)+'&user_id=eq.'+encodeURIComponent(uid)+'&revoked_at=is.null&select=id&limit=1');
   if(!device?.[0])throw new Failure(404,'Appareil introuvable ou révoqué.');
   const payload=safeObject(body?.payload||{});
   const rows=await adminApi('/rest/v1/control_center_commands',{
    method:'POST',
    body:JSON.stringify({user_id:uid,device_id:deviceId,command_type:command,payload})
   });
   const id=rows?.[0]?.id;
   await audit(uid,'command.issued',deviceId,{command_type:command,command_id:id});
   return reply({ok:true,command_id:id,status:'pending'},201);
  }

  if(action==='cancel'){
   const commandId=String(body?.command_id||'');
   await adminApi('/rest/v1/control_center_commands?id=eq.'+encodeURIComponent(commandId)+'&user_id=eq.'+encodeURIComponent(uid)+'&status=eq.pending',{
    method:'PATCH',body:JSON.stringify({status:'cancelled',completed_at:new Date().toISOString()})
   });
   await audit(uid,'command.cancelled',null,{command_id:commandId});
   return reply({ok:true});
  }

  if(action==='revoke-device'){
   const deviceId=String(body?.device_id||'');
   if(!/^[0-9a-f-]{36}$/i.test(deviceId))throw new Failure(400,'Appareil invalide.');
   const now=new Date().toISOString();
   await adminApi('/rest/v1/control_center_devices?id=eq.'+encodeURIComponent(deviceId)+'&user_id=eq.'+encodeURIComponent(uid),{
    method:'PATCH',body:JSON.stringify({revoked_at:now,updated_at:now})
   });
   await adminApi('/rest/v1/control_center_commands?device_id=eq.'+encodeURIComponent(deviceId)+'&user_id=eq.'+encodeURIComponent(uid)+'&status=eq.pending',{
    method:'PATCH',body:JSON.stringify({status:'cancelled',completed_at:now})
   }).catch(()=>{});
   await audit(uid,'device.revoked',deviceId,{});
   return reply({ok:true});
  }

  throw new Failure(400,'Action inconnue.');
 }catch(error){
  const status=error instanceof Failure?error.status:503;
  const message=error instanceof Failure?error.message:'Centre de commande momentanément indisponible.';
  return reply({error:message},status);
 }
});
