const BASE=Deno.env.get('SUPABASE_URL')!;
const ADMIN=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

class Failure extends Error{constructor(public status:number,message:string){super(message);}}
const hex=(bytes:ArrayBuffer)=>[...new Uint8Array(bytes)].map(b=>b.toString(16).padStart(2,'0')).join('');
const sha256=async(value:string)=>hex(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)));

async function api(path:string,body?:unknown,method=body===undefined?'GET':'POST'){
 const response=await fetch(BASE+path,{method,headers:{apikey:ADMIN,Authorization:'Bearer '+ADMIN,'Content-Type':'application/json',Prefer:'return=representation'},...(body===undefined?{}:{body:JSON.stringify(body)}),signal:AbortSignal.timeout(10000)});
 const data=await response.json().catch(()=>null);
 if(!response.ok)throw new Failure(response.status>=500?503:400,'Le Monde du 3B est momentanément indisponible.');
 return data;
}
const rpc=(name:string,body:unknown)=>api('/rest/v1/rpc/'+name,body);

async function authenticate(req:Request){
 const raw=req.headers.get('x-3b-session')||'';
 if(!/^[A-Za-z0-9_-]{40,80}$/.test(raw))throw new Failure(401,'Session Unreal absente.');
 const hash=await sha256(raw);
 const rows=await api('/rest/v1/world_unreal_sessions?token_hash=eq.'+hash+'&select=user_id,auth_session_id,expires_at,revoked_at&limit=1');
 const row=rows?.[0];
 if(!row||row.revoked_at||Date.parse(row.expires_at)<=Date.now())throw new Failure(401,'Session Unreal expirée.');
 if(!await rpc('loyalty_session_valid',{p_user:row.user_id,p_session:row.auth_session_id}))throw new Failure(401,'La session 3B d’origine a expiré.');
 if(!await rpc('loyalty_rate',{p_key:row.user_id+':unreal-api',p_limit:120,p_window:60}))throw new Failure(429,'Trop de requêtes.');
 await api('/rest/v1/world_unreal_sessions?token_hash=eq.'+hash,{last_seen_at:new Date().toISOString()},'PATCH');
 return row;
}

Deno.serve(async req=>{
 const headers={'Content-Type':'application/json','Cache-Control':'no-store'};
 const reply=(body:unknown,status=200)=>Response.json(body,{status,headers});
 if(req.method!=='POST')return reply({error:'Méthode non autorisée.'},405);
 try{
  if(!req.headers.get('x-3b-client')?.startsWith('unreal-'))throw new Failure(400,'Client Unreal non reconnu.');
  const session=await authenticate(req);
  const body=await req.json().catch(()=>({}));
  const action=typeof body?.action==='string'?body.action:'bootstrap';

  if(action==='heartbeat'){
   return reply({ok:true,server_time:new Date().toISOString()});
  }

  if(action!=='bootstrap')throw new Failure(400,'Action Unreal inconnue.');
  const uid=session.user_id as string;
  const [profile,state,city]=await Promise.all([
   api('/rest/v1/member_profiles?user_id=eq.'+uid+'&select=name,handle,country,xp,points,theme,created_at&limit=1'),
   api('/rest/v1/member_world_state?user_id=eq.'+uid+'&select=data,revision,legacy&limit=1'),
   api('/rest/v1/nexus_cities?user_id=eq.'+uid+'&select=city_id,origin_country,name,level&limit=1').catch(()=>[])
  ]);
  const p=profile?.[0]||{};
  const w=state?.[0]||{data:null,revision:0,legacy:false};
  return reply({
   passport:{
    user_id:uid,
    passport_id:'3B-PASS-'+uid.toUpperCase(),
    name:p.name||p.handle||'Membre 3B',
    handle:p.handle||'',
    country:p.country||'France',
    xp:Number(p.xp||0),
    points:Number(p.points||0),
    theme:p.theme||''
   },
   world:{
    revision:Number(w.revision||0),
    legacy:!!w.legacy,
    data:w.data||null
   },
   city:city?.[0]||null,
   server_time:new Date().toISOString()
  });
 }catch(error){
  return reply({error:error instanceof Failure?error.message:'Le Monde du 3B est momentanément indisponible.'},error instanceof Failure?error.status:503);
 }
});
