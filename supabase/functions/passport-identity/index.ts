import encodeQR from 'qr';

const BASE=Deno.env.get('SUPABASE_URL')!;
const ADMIN=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const PUBLIC=Deno.env.get('SUPABASE_ANON_KEY')||Deno.env.get('SUPABASE_PUBLISHABLE_KEY')||'';
const APP='https://3b-international.vercel.app';
const ORIGINS=new Set(['https://3b-international.vercel.app','capacitor://localhost','https://localhost','http://localhost:5173','http://127.0.0.1:5173']);

class Failure extends Error{constructor(public status:number,message:string){super(message);}}
const hash=async(value:string)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value))),b=>b.toString(16).padStart(2,'0')).join('');
const secret=()=>Array.from(crypto.getRandomValues(new Uint8Array(32)),b=>b.toString(16).padStart(2,'0')).join('');
const passportNumber=(id:string)=>'3B-PASS-'+id.replaceAll('-','').slice(0,16).toUpperCase();

async function api(path:string,body?:unknown,method=body===undefined?'GET':'POST'){
 const response=await fetch(BASE+path,{method,headers:{apikey:ADMIN,Authorization:'Bearer '+ADMIN,'Content-Type':'application/json',Prefer:'return=representation'},...(body===undefined?{}:{body:JSON.stringify(body)}),signal:AbortSignal.timeout(10000)});
 const data=await response.json().catch(()=>null);
 if(!response.ok)throw new Failure(response.status>=500?503:400,'Vérification momentanément indisponible.');
 return data;
}

async function userId(req:Request){
 const authorization=req.headers.get('authorization')||'';
 if(!authorization.startsWith('Bearer '))throw new Failure(401,'Connecte-toi à ton compte 3B.');
 const response=await fetch(BASE+'/auth/v1/user',{headers:{apikey:PUBLIC,Authorization:authorization},signal:AbortSignal.timeout(8000)});
 const user=await response.json().catch(()=>null);
 if(!response.ok||!user?.id)throw new Failure(401,'Ta session a expiré. Reconnecte-toi.');
 return String(user.id);
}

Deno.serve(async req=>{
 const origin=req.headers.get('origin')||'';
 const cors={...(ORIGINS.has(origin)?{'Access-Control-Allow-Origin':origin}:{}),'Access-Control-Allow-Headers':'authorization,apikey,content-type,x-client-info','Access-Control-Allow-Methods':'POST,OPTIONS','Vary':'Origin','Cache-Control':'no-store'};
 const reply=(body:unknown,status=200)=>Response.json(body,{status,headers:cors});
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers:cors});
 if(req.method!=='POST')return reply({error:'Méthode non autorisée.'},405);
 if(origin&&!ORIGINS.has(origin))return reply({error:'Origine non autorisée.'},403);
 try{
  const uid=await userId(req);
  const since=new Date(Date.now()-10*60*1000).toISOString();
  const recent=await api('/rest/v1/passport_verification_tickets?user_id=eq.'+uid+'&issued_at=gte.'+encodeURIComponent(since)+'&select=id&limit=6');
  if(Array.isArray(recent)&&recent.length>=6)throw new Failure(429,'Trop de codes générés. Réessaie dans quelques minutes.');

  const profiles=await api('/rest/v1/member_profiles?user_id=eq.'+uid+'&select=passport_public_id,passport_state,passport_version,passport_issued_at,name,handle,country,public_verified,public_title&limit=1');
  const profile=profiles?.[0];
  if(!profile?.passport_public_id)throw new Failure(409,'Ton Passeport 3B est encore en préparation.');
  if(profile.passport_state!=='active')throw new Failure(403,'Ce Passeport 3B ne peut pas être présenté.');

  const token=secret();
  const expiresAt=new Date(Date.now()+5*60*1000).toISOString();
  await api('/rest/v1/passport_verification_tickets',{
   user_id:uid,
   passport_public_id:profile.passport_public_id,
   token_hash:await hash(token),
   scopes:['identity.basic'],
   purpose:'verify',
   expires_at:expiresAt
  });

  const verifyUrl=APP+'/passport-verify.html?ticket='+token;
  const qrDataUrl=encodeQR(verifyUrl,'data-url',{ecc:'quartile',scale:6,border:4});
  return reply({
   verifyUrl,
   qrDataUrl,
   expiresAt,
   passportNumber:passportNumber(profile.passport_public_id),
   state:profile.passport_state,
   version:profile.passport_version
  });
 }catch(error){
  return reply({error:error instanceof Failure?error.message:'Vérification momentanément indisponible.'},error instanceof Failure?error.status:500);
 }
});