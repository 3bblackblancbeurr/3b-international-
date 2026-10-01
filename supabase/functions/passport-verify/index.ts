const BASE=Deno.env.get('SUPABASE_URL')!;
import {bundledKey} from '../_shared/passport-server.ts';
const ADMIN=bundledKey('SUPABASE_SECRET_KEYS','SUPABASE_SERVICE_ROLE_KEY');
class Failure extends Error{constructor(public status:number,message:string){super(message);}}
const hash=async(value:string)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value))),b=>b.toString(16).padStart(2,'0')).join('');
const passportNumber=(id:string)=>'3B-PASS-'+String(id).toUpperCase();

async function api(path:string,body?:unknown,method=body===undefined?'GET':'POST'){
 const response=await fetch(BASE+path,{method,headers:{apikey:ADMIN,...(ADMIN.startsWith('sb_secret_')?{}:{Authorization:'Bearer '+ADMIN}),'Content-Type':'application/json',Prefer:'return=representation'},...(body===undefined?{}:{body:JSON.stringify(body)}),signal:AbortSignal.timeout(10000)});
 const data=await response.json().catch(()=>null);
 if(!response.ok)throw new Failure(response.status>=500?503:400,'Verification impossible.');
 return data;
}

Deno.serve(async req=>{
 const headers={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'content-type,apikey','Access-Control-Allow-Methods':'POST,OPTIONS','Cache-Control':'no-store','Content-Security-Policy':"default-src 'none'; frame-ancestors 'none'"};
 const reply=(body:unknown,status=200)=>Response.json(body,{status,headers});
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers});
 if(req.method!=='POST')return reply({valid:false,error:'Methode non autorisee.'},405);
 try{
  const ip=(req.headers.get('x-forwarded-for')||'unknown').split(',')[0].trim().slice(0,80);
  const allowed=await api('/rest/v1/rpc/loyalty_rate',{p_key:'passport-verify:'+await hash(ip),p_limit:30,p_window:60});
  if(allowed!==true)throw new Failure(429,'Trop de verifications. Reessaie dans une minute.');

  const reader=req.body?.getReader();if(!reader)throw new Failure(400,'Code invalide ou expire.');
  let text='',size=0;const decoder=new TextDecoder();
  for(;;){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;
   if(size>4096){await reader.cancel();throw new Failure(413,'Demande trop volumineuse.');}text+=decoder.decode(value,{stream:true});}
  text+=decoder.decode();let body;try{body=JSON.parse(text);}catch{throw new Failure(400,'Code invalide ou expire.');}
  const token=String(body?.ticket||'').trim().toLowerCase();
  if(!/^[0-9a-f]{64}$/.test(token))throw new Failure(400,'Code invalide ou expire.');

  const now=new Date().toISOString();
  const tokenHash=await hash(token);
  const tickets=await api('/rest/v1/passport_verification_tickets?token_hash=eq.'+tokenHash+'&consumed_at=is.null&revoked_at=is.null&expires_at=gt.'+encodeURIComponent(now)+'&select=id,passport_public_id,purpose,scopes&limit=1',{consumed_at:now},'PATCH');
  const ticket=tickets?.[0];
  if(!ticket?.passport_public_id)throw new Failure(400,'Code invalide ou expire.');
  if(ticket.purpose!=='verify'||!Array.isArray(ticket.scopes)||!ticket.scopes.includes('identity.basic'))throw new Failure(400,'Code invalide ou expire.');

  const profiles=await api('/rest/v1/member_profiles?passport_public_id=eq.'+ticket.passport_public_id+'&select=user_id,passport_public_id,passport_state,passport_version,passport_issued_at,name,handle,country,public_verified,public_title,identity_verification_state,identity_assurance_level,identity_verified_at,identity_verification_ref_hash&limit=1');
  const profile=profiles?.[0];
  if(!profile||profile.passport_state!=='active')throw new Failure(400,'Code invalide ou expire.');
  const liveVerified=await api('/rest/v1/rpc/passport_identity_live_assertion',{p_user:profile.user_id,p_reference:profile.identity_verification_ref_hash})===true;

  return reply({
   valid:true,
   passport:{
    number:passportNumber(profile.passport_public_id),
    displayName:String(profile.name||'Membre 3B').slice(0,80),
    handle:String(profile.handle||'').slice(0,24),
    country:String(profile.country||'').slice(0,32),
    state:'active',
    version:Number(profile.passport_version)||2,
    issuedAt:profile.passport_issued_at||null,
    identityVerified:liveVerified,
    identityAssuranceLevel:liveVerified?String(profile.identity_assurance_level):'self_asserted',
    identityVerifiedAt:liveVerified?profile.identity_verified_at:null,
    publicBadgeVerified:profile.public_verified===true,
    title:profile.public_verified===true?String(profile.public_title||'').slice(0,80):''
   }
  });
 }catch(error){
  return reply({valid:false,error:error instanceof Failure?error.message:'Verification impossible.'},error instanceof Failure?error.status:500);
 }
});
