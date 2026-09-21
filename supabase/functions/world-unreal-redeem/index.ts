const BASE=Deno.env.get('SUPABASE_URL')!;
const ADMIN=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

class Failure extends Error{constructor(public status:number,message:string){super(message);}}
const hex=(bytes:ArrayBuffer)=>[...new Uint8Array(bytes)].map(b=>b.toString(16).padStart(2,'0')).join('');
const sha256=async(value:string)=>hex(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)));
function randomToken(){
 const bytes=new Uint8Array(32);crypto.getRandomValues(bytes);
 let binary='';for(const b of bytes)binary+=String.fromCharCode(b);
 return btoa(binary).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
}
async function api(path:string,body?:unknown,method=body===undefined?'GET':'POST'){
 const response=await fetch(BASE+path,{method,headers:{apikey:ADMIN,Authorization:'Bearer '+ADMIN,'Content-Type':'application/json',Prefer:'return=representation'},...(body===undefined?{}:{body:JSON.stringify(body)}),signal:AbortSignal.timeout(10000)});
 const data=await response.json().catch(()=>null);
 if(!response.ok)throw new Failure(response.status>=500?503:400,'Synchronisation Unreal momentanément indisponible.');
 return data;
}
const rpc=(name:string,body:unknown)=>api('/rest/v1/rpc/'+name,body);

Deno.serve(async req=>{
 const headers={'Content-Type':'application/json','Cache-Control':'no-store'};
 const reply=(body:unknown,status=200)=>Response.json(body,{status,headers});
 if(req.method!=='POST')return reply({error:'Méthode non autorisée.'},405);
 try{
  if(!req.headers.get('x-3b-client')?.startsWith('unreal-'))throw new Failure(400,'Client Unreal non reconnu.');
  const length=Number(req.headers.get('content-length')||0);
  if(length>8192)throw new Failure(413,'Demande trop volumineuse.');
  const body=await req.json().catch(()=>null);
  const ticket=typeof body?.ticket==='string'?body.ticket:'';
  const device=typeof body?.device==='string'?body.device.slice(0,128):'';
  if(!/^[A-Za-z0-9_-]{40,80}$/.test(ticket))throw new Failure(400,'Ticket 3B invalide.');

  const ip=req.headers.get('cf-connecting-ip')||req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()||'unknown';
  const ipKey=(await sha256(ip)).slice(0,24);
  if(!await rpc('loyalty_rate',{p_key:'unreal-redeem:'+ipKey,p_limit:60,p_window:60}))throw new Failure(429,'Trop de tentatives.');

  const sessionToken=randomToken();
  const [ticketHash,sessionHash]=await Promise.all([sha256(ticket),sha256(sessionToken)]);
  const redeemed=await rpc('world_unreal_redeem_ticket',{
   p_ticket_hash:ticketHash,
   p_device:device,
   p_session_token_hash:sessionHash,
   p_session_ttl_seconds:1800
  });
  const identity=redeemed?.[0];
  if(!identity?.user_id)throw new Failure(401,'Ce ticket 3B est expiré ou déjà utilisé.');

  const uid=identity.user_id as string;
  const [profile,state]=await Promise.all([
   api('/rest/v1/member_profiles?user_id=eq.'+uid+'&select=name,handle,country,xp,points&limit=1'),
   api('/rest/v1/member_world_state?user_id=eq.'+uid+'&select=revision&limit=1')
  ]);
  const p=profile?.[0]||{};
  return reply({
   session_token:sessionToken,
   user_id:uid,
   passport_id:'3B-PASS-'+uid.toUpperCase(),
   country:p.country||'France',
   world_revision:Number(state?.[0]?.revision||0),
   expires_in:1800
  });
 }catch(error){
  return reply({error:error instanceof Failure?error.message:'Synchronisation Unreal momentanément indisponible.'},error instanceof Failure?error.status:503);
 }
});
