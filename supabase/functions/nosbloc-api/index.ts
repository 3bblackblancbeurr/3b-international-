const BASE=Deno.env.get('SUPABASE_URL')!;
const ADMIN=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const PUBLIC=Deno.env.get('SUPABASE_ANON_KEY')!;
const APP_URL=(Deno.env.get('APP_URL')||'https://3b-international.vercel.app').replace(/\/$/,'');
const ORIGINS=new Set([APP_URL,'https://localhost','capacitor://localhost','http://localhost:5173','http://127.0.0.1:5173','http://localhost:5174','http://127.0.0.1:5174']);
class Failure extends Error{constructor(public status:number,message:string){super(message);}}

async function api(path:string,body?:unknown,method=body===undefined?'GET':'POST'){
  const response=await fetch(BASE+path,{
    method,
    headers:{apikey:ADMIN,Authorization:'Bearer '+ADMIN,'Content-Type':'application/json',Prefer:'return=representation'},
    ...(body===undefined?{}:{body:JSON.stringify(body)}),
    signal:AbortSignal.timeout(12000)
  });
  const data=await response.json().catch(()=>null);
  if(!response.ok)throw new Failure(response.status>=500?503:response.status,'La demande Nosbloc n’a pas abouti.');
  return data;
}
const rpc=(name:string,body:unknown)=>api('/rest/v1/rpc/'+name,body);

async function authenticate(req:Request){
  const header=req.headers.get('authorization')||'';
  if(!header.startsWith('Bearer '))throw new Failure(401,'Connecte-toi à ton compte 3B.');
  const response=await fetch(BASE+'/auth/v1/user',{headers:{apikey:PUBLIC,Authorization:header},signal:AbortSignal.timeout(10000)});
  const user=await response.json();
  if(!response.ok||!user.id)throw new Failure(401,'Ta session a expiré. Reconnecte-toi.');
  return user.id as string;
}
function uuid(value:unknown){
  const text=String(value||'');
  if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(text))throw new Failure(400,'Identifiant Nosbloc invalide.');
  return text;
}
function cleanText(value:unknown,max:number){
  return String(value||'').trim().slice(0,max);
}
async function readJson(req:Request){
  if(!req.headers.get('content-type')?.startsWith('application/json'))throw new Failure(415,'Format invalide.');
  const text=await req.text();
  if(text.length>32768)throw new Failure(413,'Demande trop volumineuse.');
  try{return JSON.parse(text);}catch{throw new Failure(400,'Demande invalide.');}
}
async function ownerProject(uid:string,projectId:string){
  const rows=await api('/rest/v1/nosbloc_projects?project_id=eq.'+encodeURIComponent(projectId)+'&owner_id=eq.'+encodeURIComponent(uid)+'&select=project_id,owner_id,status,visibility,publication_locked,monetization_locked,active_version&limit=1');
  if(!rows?.[0])throw new Failure(403,'Tu n’as pas les droits sur ce projet.');
  return rows[0];
}
async function schemaReady(){
  try{
    await api('/rest/v1/nosbloc_creator_profiles?select=user_id&limit=1');
    return true;
  }catch{return false;}
}

Deno.serve(async req=>{
  const origin=req.headers.get('origin')||'';
  const cors={
    ...(ORIGINS.has(origin)?{'Access-Control-Allow-Origin':origin}:{}),
    'Access-Control-Allow-Headers':'authorization,apikey,content-type,x-client-info',
    'Access-Control-Allow-Methods':'POST,OPTIONS',
    'Vary':'Origin','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'
  };
  const reply=(body:unknown,status=200)=>Response.json(body,{status,headers:cors});
  if(req.method==='OPTIONS')return new Response(null,{status:204,headers:cors});
  if(req.method!=='POST')return reply({error:'Méthode non autorisée.'},405);
  if(origin&&!ORIGINS.has(origin))return reply({error:'Origine non autorisée.'},403);

  try{
    const body=await readJson(req);
    if(!body||typeof body!=='object'||Array.isArray(body))throw new Failure(400,'Demande invalide.');
    const uid=await authenticate(req);
    const action=String(body.action||'');

    if(action==='health')return reply({ready:await schemaReady()});
    if(!await schemaReady())throw new Failure(503,'Nosbloc Cloud est prêt côté application mais le schéma serveur n’est pas encore activé.');

    if(action==='snapshot'){
      const [profiles,projects,ledger,payouts]=await Promise.all([
        api('/rest/v1/nosbloc_creator_profiles?user_id=eq.'+uid+'&select=user_id,studio_name,creator_level,verification_status,payout_status,trust_score,country_code,tax_profile_complete,updated_at'),
        api('/rest/v1/nosbloc_projects?owner_id=eq.'+uid+'&select=project_id,title,project_type,template_key,description,audience,status,visibility,readiness_score,trust_score,publication_locked,monetization_locked,active_version,metadata,created_at,updated_at&order=updated_at.desc&limit=80'),
        api('/rest/v1/nosbloc_ledger_entries?account_user_id=eq.'+uid+'&select=entry_id,transaction_id,project_id,entry_type,direction,amount_cents,currency,status,available_at,created_at&order=created_at.desc&limit=100'),
        api('/rest/v1/nosbloc_payout_accounts?user_id=eq.'+uid+'&select=kyc_status,tax_status,payouts_enabled,minimum_payout_cents,updated_at&limit=1')
      ]);
      return reply({profile:profiles?.[0]||null,projects:projects||[],ledger:ledger||[],payout:payouts?.[0]||null});
    }

    if(action==='ensure-profile'){
      const studio=cleanText(body.studioName,60)||'Mon studio 3B';
      const existing=await api('/rest/v1/nosbloc_creator_profiles?user_id=eq.'+uid+'&select=user_id&limit=1');
      if(!existing?.length)await api('/rest/v1/nosbloc_creator_profiles',{user_id:uid,studio_name:studio});
      return reply({ok:true});
    }

    if(action==='save-project'){
      const project=body.project||{};
      const projectId=project.project_id?uuid(project.project_id):null;
      const payload={
        owner_id:uid,
        title:cleanText(project.title,80),
        project_type:['world','game','story','fashion','music','shop'].includes(project.project_type)?project.project_type:'world',
        template_key:cleanText(project.template_key,120)||'default',
        description:cleanText(project.description,2000),
        audience:cleanText(project.audience,60)||'Tout public',
        status:'draft',
        visibility:'private',
        publication_locked:true,
        monetization_locked:true,
        readiness_score:Math.max(0,Math.min(100,Number(project.readiness_score)||0)),
        metadata:project.metadata&&typeof project.metadata==='object'?project.metadata:{}
      };
      if(payload.title.length<3)throw new Failure(400,'Nom de projet trop court.');
      if(projectId){
        await ownerProject(uid,projectId);
        const rows=await api('/rest/v1/nosbloc_projects?project_id=eq.'+projectId+'&owner_id=eq.'+uid,payload,'PATCH');
        return reply({project:rows?.[0]||null});
      }
      const rows=await api('/rest/v1/nosbloc_projects',payload,'POST');
      return reply({project:rows?.[0]||null},201);
    }

    if(action==='create-version'){
      const projectId=uuid(body.projectId);
      await ownerProject(uid,projectId);
      const stage=['checkpoint','review'].includes(body.stage)?body.stage:'checkpoint';
      const snapshot=body.snapshot;
      if(!snapshot||typeof snapshot!=='object'||Array.isArray(snapshot))throw new Failure(400,'Version invalide.');
      const encoded=JSON.stringify(snapshot);
      if(encoded.length>900000)throw new Failure(413,'Version trop volumineuse.');
      const hashBytes=new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(encoded)));
      const snapshotHash=Array.from(hashBytes,b=>b.toString(16).padStart(2,'0')).join('');
      const existing=await api('/rest/v1/nosbloc_project_versions?project_id=eq.'+projectId+'&select=version_no&order=version_no.desc&limit=1');
      const versionNo=(Number(existing?.[0]?.version_no)||0)+1;
      const rows=await api('/rest/v1/nosbloc_project_versions',{
        project_id:projectId,version_no:versionNo,stage,snapshot,snapshot_hash:snapshotHash,
        note:cleanText(body.note,160),created_by:uid
      });
      if(stage==='review'){
        await api('/rest/v1/nosbloc_projects?project_id=eq.'+projectId+'&owner_id=eq.'+uid,{status:'review',visibility:'private',publication_locked:true,monetization_locked:true},'PATCH');
      }
      return reply({version:rows?.[0]||null});
    }

    if(action==='ledger-summary'){
      const rows=await api('/rest/v1/nosbloc_ledger_entries?account_user_id=eq.'+uid+'&select=direction,amount_cents,currency,status,entry_type,created_at&order=created_at.desc&limit=500');
      const summary={available_cents:0,pending_cents:0,paid_cents:0,currency:'EUR'};
      for(const row of rows||[]){
        const sign=row.direction==='credit'?1:-1;
        const value=sign*Number(row.amount_cents||0);
        if(row.status==='available')summary.available_cents+=value;
        if(row.status==='pending'||row.status==='held')summary.pending_cents+=value;
        if(row.status==='paid')summary.paid_cents+=value;
      }
      return reply({summary,entries:rows||[]});
    }

    if(action==='request-payout'){
      throw new Failure(423,'Les versements restent verrouillés tant que KYC, fiscalité et prestataire de paiement ne sont pas validés côté serveur.');
    }
    if(action==='publish'||action==='approve'||action==='ledger-write'||action==='refund'){
      throw new Failure(403,'Cette opération sensible ne peut pas être déclenchée depuis le client.');
    }

    throw new Failure(400,'Action Nosbloc inconnue.');
  }catch(error){
    return reply({error:error instanceof Failure?error.message:'Service Nosbloc momentanément indisponible.'},error instanceof Failure?error.status:400);
  }
});
