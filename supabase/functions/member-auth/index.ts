import {validateAccount,accountEmail} from './loyalty.js';
const BASE=Deno.env.get('SUPABASE_URL')!;
const ADMIN=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const PUBLIC=Deno.env.get('SUPABASE_ANON_KEY')!;
const ORIGINS=new Set([
 'https://3b-international.vercel.app',
 'https://localhost',
 'capacitor://localhost',
 'http://localhost:5173',
 'http://127.0.0.1:5173',
 'http://localhost:5174',
 'http://127.0.0.1:5174'
]);
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
async function readJson(req:Request){
 if(!req.headers.get('content-type')?.startsWith('application/json'))throw new Failure(415,'Format invalide.');
 const reader=req.body?.getReader(),decoder=new TextDecoder();let text='',bytes=0;
 if(reader)try{
  while(true){const chunk=await reader.read();if(chunk.done)break;bytes+=chunk.value.byteLength;if(bytes>8192){await reader.cancel();throw new Failure(413,'Demande trop volumineuse.');}text+=decoder.decode(chunk.value,{stream:true});}
  text+=decoder.decode();
 }finally{reader.releaseLock();}
 try{return JSON.parse(text);}catch{throw new Failure(400,'Demande invalide.');}
}
Deno.serve(async req=>{
 const origin=req.headers.get('origin')||'';
 const cors={...(ORIGINS.has(origin)?{'Access-Control-Allow-Origin':origin}:{}),'Access-Control-Allow-Headers':'apikey,content-type,x-client-info','Access-Control-Allow-Methods':'POST,OPTIONS','Vary':'Origin','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};
 const reply=(body:unknown,status=200)=>Response.json(body,{status,headers:cors});
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers:cors});
 if(req.method!=='POST')return reply({error:'Méthode non autorisée.'},405);
 if(origin&&!ORIGINS.has(origin))return reply({error:'Origine non autorisée.'},403);
 try{
  const body=await readJson(req);if(!body||typeof body!=='object'||Array.isArray(body))throw new Failure(400,'Demande invalide.');
  const action=body.action;if(action!=='register'&&action!=='recover')throw new Failure(404,'Action publique inconnue.');
  const input=validateAccount(body);
  const forwarded=(req.headers.get('x-forwarded-for')||'unknown').split(',').at(-1)!.trim();
  const ipKey=await hash(action+':'+forwarded);
  if(!await rpc('loyalty_rate',{p_key:ipKey,p_limit:action==='register'?5:8,p_window:3600}))throw new Failure(429,'Trop de tentatives. Réessaie dans une heure.');

  if(action==='register'){
   const recovery=secret();let user;
   try{user=await api('/auth/v1/admin/users',{email:accountEmail(input.handle),password:input.password,email_confirm:true,user_metadata:{display_name:input.name}});}
   catch{throw new Failure(409,'Cet identifiant est indisponible. Choisis-en un autre ou connecte-toi.');}
   try{await api('/rest/v1/member_profiles',{user_id:user.id,handle:input.handle,name:input.name,country:input.country,recovery_hash:await hash(recovery)});}
   catch(error){await api('/auth/v1/admin/users/'+user.id,undefined,'DELETE').catch(()=>{});throw error;}
   return reply({recovery,handle:input.handle});
  }

  const code=String(body.recovery||'').replace(/\s|-/g,'').toLowerCase();
  if(!/^[a-f0-9]{64}$/.test(code))throw new Failure(400,'Clé de secours invalide.');
  const recovery=secret(),oldHash=await hash(code),newHash=await hash(recovery);
  const uid=await rpc('loyalty_recovery',{p_handle:input.handle,p_old:oldHash,p_new:newHash});
  if(!uid)throw new Failure(400,'Identifiant ou clé de secours incorrect.');
  try{await api('/auth/v1/admin/users/'+uid,{password:input.password},'PUT');}
  catch(error){await rpc('loyalty_recovery',{p_handle:input.handle,p_old:newHash,p_new:oldHash});throw error;}
  const login=await api('/auth/v1/token?grant_type=password',{email:accountEmail(input.handle),password:input.password},'POST',PUBLIC);
  await fetch(BASE+'/auth/v1/logout?scope=others',{method:'POST',headers:{apikey:PUBLIC,Authorization:'Bearer '+login.access_token}});
  return reply({recovery,session:login});
 }catch(error){
  return reply({error:error instanceof Failure?error.message:error instanceof Error&&error.message.startsWith('Choisis')?error.message:'Service momentanément indisponible. Réessaie dans un instant.'},error instanceof Failure?error.status:400);
 }
});
