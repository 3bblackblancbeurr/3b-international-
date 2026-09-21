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
 if(!response.ok)throw new Failure(response.status>=500?503:400,'Agent 3B indisponible.');
 return data;
}
async function sha256(value:string){
 const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value));
 return[...new Uint8Array(digest)].map(b=>b.toString(16).padStart(2,'0')).join('');
}
function secret(){
 return[...crypto.getRandomValues(new Uint8Array(32))].map(b=>b.toString(16).padStart(2,'0')).join('');
}
function ip(req:Request){
 return(req.headers.get('cf-connecting-ip')||req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()||'unknown').slice(0,128);
}
async function audit(user_id:string|null,device_id:string|null,event_type:string,detail:Record<string,unknown>={}){
 await adminApi('/rest/v1/control_center_events',{
  method:'POST',body:JSON.stringify({user_id,device_id,event_type,detail})
 }).catch(()=>{});
}
async function authenticateDevice(req:Request){
 const token=String(req.headers.get('x-3b-device-token')||'').trim().toLowerCase();
 if(!/^[0-9a-f]{64}$/.test(token))throw new Failure(401,'Jeton appareil requis.');
 const tokenHash=await sha256(token);
 const rows=await adminApi('/rest/v1/control_center_devices?token_hash=eq.'+tokenHash+'&revoked_at=is.null&select=id,user_id,name,platform,agent_version,capabilities&limit=1');
 const device=rows?.[0];
 if(!device)throw new Failure(401,'Appareil non autorisé.');
 return device;
}

Deno.serve(async(req:Request)=>{
 const reply=(body:unknown,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store'}});
 if(req.method!=='POST')return reply({error:'Méthode non autorisée.'},405);

 try{
  const body=await req.json().catch(()=>{throw new Failure(400,'JSON invalide.');});
  const action=String(body?.action||'');

  if(action==='pair'){
   const code=String(body?.code||'').trim().toUpperCase();
   if(!/^[A-HJ-NP-Z2-9]{10}$/.test(code))throw new Failure(400,'Code d’appairage invalide.');
   const ipHash=await sha256('control-pair:'+ip(req));
   const allowed=await adminApi('/rest/v1/rpc/loyalty_rate',{
    method:'POST',body:JSON.stringify({p_key:ipHash,p_limit:8,p_window:900})
   });
   if(allowed!==true)throw new Failure(429,'Trop de tentatives d’appairage.');

   const codeHash=await sha256(code);
   const pairings=await adminApi('/rest/v1/control_center_pairings?code_hash=eq.'+codeHash+'&used_at=is.null&select=user_id,expires_at&limit=1');
   const pairing=pairings?.[0];
   if(!pairing||new Date(pairing.expires_at).getTime()<=Date.now())throw new Failure(400,'Code expiré ou invalide.');

   const deviceToken=secret(),tokenHash=await sha256(deviceToken);
   const capabilities=body?.capabilities&&typeof body.capabilities==='object'&&!Array.isArray(body.capabilities)?body.capabilities:{};
   const deviceId=await adminApi('/rest/v1/rpc/control_center_pair_device',{
    method:'POST',
    body:JSON.stringify({
     p_user:pairing.user_id,
     p_code_hash:codeHash,
     p_device_name:String(body?.device_name||'PC 3B').slice(0,80),
     p_platform:String(body?.platform||'unknown').slice(0,40),
     p_agent_version:String(body?.agent_version||'1').slice(0,40),
     p_capabilities:capabilities,
     p_token_hash:tokenHash
    })
   });
   await audit(pairing.user_id,deviceId,'device.paired',{platform:String(body?.platform||'unknown').slice(0,40)});
   return reply({ok:true,device_id:deviceId,device_token:deviceToken},201);
  }

  const device=await authenticateDevice(req);

  if(action==='heartbeat'){
   const capabilities=body?.capabilities&&typeof body.capabilities==='object'&&!Array.isArray(body.capabilities)?body.capabilities:{};
   await adminApi('/rest/v1/rpc/control_center_touch_device',{
    method:'POST',
    body:JSON.stringify({
     p_device:device.id,
     p_agent_version:String(body?.agent_version||device.agent_version||'1').slice(0,40),
     p_capabilities:capabilities
    })
   });
   const command=await adminApi('/rest/v1/rpc/control_center_claim_command',{
    method:'POST',body:JSON.stringify({p_device:device.id})
   });
   return reply({ok:true,device_id:device.id,command:command||null});
  }

  if(action==='complete'){
   const commandId=String(body?.command_id||'');
   if(!/^[0-9a-f-]{36}$/i.test(commandId))throw new Failure(400,'Commande invalide.');
   const result=body?.result&&typeof body.result==='object'&&!Array.isArray(body.result)?body.result:{};
   if(new TextEncoder().encode(JSON.stringify(result)).byteLength>16384)throw new Failure(413,'Résultat trop volumineux.');
   const ok=body?.ok===true;
   const completed=await adminApi('/rest/v1/rpc/control_center_complete_command',{
    method:'POST',
    body:JSON.stringify({
     p_device:device.id,
     p_command:commandId,
     p_ok:ok,
     p_result:result,
     p_error:ok?null:String(body?.error||'Command failed').slice(0,500)
    })
   });
   if(completed!==true)throw new Failure(409,'Commande déjà terminée ou invalide.');
   await audit(device.user_id,device.id,ok?'command.succeeded':'command.failed',{command_id:commandId});
   return reply({ok:true});
  }

  throw new Failure(400,'Action inconnue.');
 }catch(error){
  const status=error instanceof Failure?error.status:503;
  const message=error instanceof Failure?error.message:'Agent 3B momentanément indisponible.';
  return reply({error:message},status);
 }
});
