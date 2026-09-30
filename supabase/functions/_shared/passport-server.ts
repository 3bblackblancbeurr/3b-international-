import {sha256} from './passport-security.js';

export class Failure extends Error { constructor(public status:number, message:string) { super(message); } }
export function bundledKey(bundle:string, legacy:string) {
  try { const value=JSON.parse(Deno.env.get(bundle)||'{}'); if(typeof value.default==='string') return value.default; } catch {}
  return Deno.env.get(legacy)||'';
}
const BASE=Deno.env.get('SUPABASE_URL')||'';
const ADMIN=bundledKey('SUPABASE_SECRET_KEYS','SUPABASE_SERVICE_ROLE_KEY');
const PUBLIC=bundledKey('SUPABASE_PUBLISHABLE_KEYS','SUPABASE_ANON_KEY');
export async function api(path:string, body?:unknown, method=body===undefined?'GET':'POST') {
  if (!BASE||!ADMIN) throw new Failure(503,'Service Passeport en préparation.');
  const response=await fetch(BASE+path,{method,headers:{apikey:ADMIN,
    ...(ADMIN.startsWith('sb_secret_')?{}:{Authorization:'Bearer '+ADMIN}),
    ...(body===undefined?{}:{'Content-Type':'application/json',Prefer:'return=representation'})},
    ...(body===undefined?{}:{body:JSON.stringify(body)}),signal:AbortSignal.timeout(12000)});
  const data=await response.json().catch(()=>null);
  if(!response.ok) throw new Failure(response.status>=500?503:409,'La demande est expirée, déjà utilisée ou non autorisée.');
  return data;
}
export const rpc=(name:string, body:unknown)=>api('/rest/v1/rpc/'+name,body);
export async function authenticate(req:Request) {
  const authorization=req.headers.get('authorization')||'';
  if(!PUBLIC||!authorization.startsWith('Bearer ')) throw new Failure(401,'Connecte-toi à ton compte 3B.');
  const response=await fetch(BASE+'/auth/v1/user',{headers:{apikey:PUBLIC,Authorization:authorization},signal:AbortSignal.timeout(10000)});
  const user=await response.json().catch(()=>null);
  if(!response.ok||!user?.id) throw new Failure(401,'Reconnecte-toi à ton compte 3B.');
  let sid='';
  // Decode only after Supabase has verified this same bearer token.
  try { const part=authorization.slice(7).split('.')[1]; sid=JSON.parse(atob(part.replace(/-/g,'+').replace(/_/g,'/'))).session_id||''; } catch {}
  if(!/^[0-9a-f-]{36}$/i.test(sid)||await rpc('loyalty_session_valid',{p_user:user.id,p_session:sid})!==true)
    throw new Failure(401,'Ta session a expiré.');
  return {userId:String(user.id),sessionId:sid};
}
export async function rate(key:string,limit=20,window=300) {
  if(await rpc('loyalty_rate',{p_key:key,p_limit:limit,p_window:window})!==true) throw new Failure(429,'Réessaie dans quelques minutes.');
}
export function serve(handler:(req:Request,body:Record<string,unknown>)=>Promise<unknown>,maxBody=20000) {
  const app=(Deno.env.get('APP_URL')||'https://3b-international.vercel.app').replace(/\/$/,'');
  const origins=new Set([app]); // WebAuthn requires a verified HTTPS origin; no wildcard/native fallback.
  Deno.serve(async req=>{
    const origin=req.headers.get('origin')||'';
    const headers={...(origins.has(origin)?{'Access-Control-Allow-Origin':origin}:{}),
      'Access-Control-Allow-Headers':'authorization,apikey,content-type,x-client-info',
      'Access-Control-Allow-Methods':'POST,OPTIONS','Cache-Control':'no-store','Vary':'Origin','X-Content-Type-Options':'nosniff'};
    const reply=(body:unknown,status=200)=>Response.json(body,{status,headers});
    if(req.method==='OPTIONS') return new Response(null,{status:204,headers});
    if(req.method!=='POST') return reply({error:'Méthode non autorisée.'},405);
    if(origin&&!origins.has(origin)) return reply({error:'Origine non autorisée.'},403);
    try {
      if((req.headers.get('content-type')||'').split(';')[0]!=='application/json') throw new Failure(415,'Format invalide.');
      const reader=req.body?.getReader(); let size=0; const parts:Uint8Array[]=[];
      if(!reader) throw new Failure(400,'Demande vide.');
      for(;;) { const {done,value}=await reader.read(); if(done)break; size+=value.length;
        if(size>maxBody) {await reader.cancel();throw new Failure(413,'Demande trop volumineuse.');} parts.push(value); }
      const bytes=new Uint8Array(size);let offset=0;for(const part of parts){bytes.set(part,offset);offset+=part.length;}
      let body;try{body=JSON.parse(new TextDecoder().decode(bytes));}catch{throw new Failure(400,'Demande invalide.');}
      if(!body||Array.isArray(body)||typeof body!=='object') throw new Failure(400,'Demande invalide.');
      return reply(await handler(req,body));
    } catch(error) {
      return reply({error:error instanceof Failure?error.message:'Service Passeport momentanément indisponible.'},error instanceof Failure?error.status:500);
    }
  });
}
export {sha256};
