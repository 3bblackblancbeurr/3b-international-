const BASE=Deno.env.get('SUPABASE_URL')!;
const ADMIN=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const PUBLIC=Deno.env.get('SUPABASE_ANON_KEY')!;
const ORIGINS=new Set(['https://3b-international.vercel.app','capacitor://localhost','http://localhost:5173','http://127.0.0.1:5173']);

class Failure extends Error{constructor(public status:number,message:string){super(message);}}
const hex=(bytes:ArrayBuffer)=>[...new Uint8Array(bytes)].map(b=>b.toString(16).padStart(2,'0')).join('');
const sha256=async(value:string)=>hex(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)));
function randomToken(){
 const bytes=new Uint8Array(32);crypto.getRandomValues(bytes);
 let binary='';for(const b of bytes)binary+=String.fromCharCode(b);
 return btoa(binary).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
}
function sessionId(header:string){
 try{
  const part=header.slice(7).split('.')[1];const normalized=part.replace(/-/g,'+').replace(/_/g,'/');
  const padded=normalized.padEnd(Math.ceil(normalized.length/4)*4,'=');
  return JSON.parse(atob(padded)).session_id as string;
 }catch{return '';}
}
async function api(path:string,body?:unknown,method=body===undefined?'GET':'POST'){
 const response=await fetch(BASE+path,{method,headers:{apikey:ADMIN,Authorization:'Bearer '+ADMIN,'Content-Type':'application/json',Prefer:'return=representation'},...(body===undefined?{}:{body:JSON.stringify(body)}),signal:AbortSignal.timeout(10000)});
 const data=await response.json().catch(()=>null);
 if(!response.ok)throw new Failure(response.status>=500?503:400,'Le portail 3B est momentanément indisponible.');
 return data;
}
const rpc=(name:string,body:unknown)=>api('/rest/v1/rpc/'+name,body);
async function authenticate(req:Request){
 const header=req.headers.get('authorization')||'';
 if(!header.startsWith('Bearer '))throw new Failure(401,'Connecte-toi à ton compte 3B.');
 const response=await fetch(BASE+'/auth/v1/user',{headers:{apikey:PUBLIC,Authorization:header},signal:AbortSignal.timeout(10000)});
 const user=await response.json().catch(()=>null);
 if(!response.ok||!user?.id)throw new Failure(401,'Ta session a expiré. Reconnecte-toi.');
 const sid=sessionId(header);
 if(!sid||!await rpc('loyalty_session_valid',{p_user:user.id,p_session:sid}))throw new Failure(401,'Ta session a expiré. Reconnecte-toi.');
 return{uid:user.id as string,sid};
}

Deno.serve(async req=>{
 const origin=req.headers.get('origin')||'';
 const cors={...(ORIGINS.has(origin)?{'Access-Control-Allow-Origin':origin}:{}),'Access-Control-Allow-Headers':'authorization,apikey,content-type,x-client-info','Access-Control-Allow-Methods':'POST,OPTIONS','Vary':'Origin','Cache-Control':'no-store'};
 const reply=(body:unknown,status=200)=>Response.json(body,{status,headers:cors});
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers:cors});
 if(req.method!=='POST')return reply({error:'Méthode non autorisée.'},405);
 if(origin&&!ORIGINS.has(origin))return reply({error:'Origine non autorisée.'},403);
 try{
  const {uid,sid}=await authenticate(req);
  if(!await rpc('loyalty_rate',{p_key:uid+':unreal-launch',p_limit:8,p_window:60}))throw new Failure(429,'Trop de tentatives. Patiente un instant.');

  const ticket=randomToken();
  const ticketHash=await sha256(ticket);
  const expiresAt=new Date(Date.now()+90_000).toISOString();
  await api('/rest/v1/world_unreal_launch_tickets',{
   ticket_hash:ticketHash,user_id:uid,auth_session_id:sid,client:'app-3b',expires_at:expiresAt
  });

  return reply({
   ticket,
   launch_url:`threebworld://launch?ticket=${encodeURIComponent(ticket)}&api=${encodeURIComponent(BASE)}`,
   expires_in:90
  });
 }catch(error){
  return reply({error:error instanceof Failure?error.message:'Le portail 3B est momentanément indisponible.'},error instanceof Failure?error.status:503);
 }
});
