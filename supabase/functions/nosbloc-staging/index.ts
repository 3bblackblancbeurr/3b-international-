import { normalizeMemberHandle, normalizeModerationDecision, normalizeProjectPayload, normalizeUuid, normalizeVersionStage, stableStringify, validateProjectPayload } from "./contract.js";

const BASE = Deno.env.get("SUPABASE_URL")!;
const PUBLIC = Deno.env.get("SUPABASE_ANON_KEY")!;
const STAGING_PROJECT_REF = "zykdfgahzqqanlyxjtbe";
const ENABLED = BASE.includes(`://${STAGING_PROJECT_REF}.supabase.co`) && Deno.env.get("NOSBLOC_STAGING_ENABLED") !== "false";
const ORIGINS = new Set(["https://localhost","capacitor://localhost","https://3b-international.vercel.app","http://localhost:5173","http://127.0.0.1:5173"]);
const ACTIONS = new Set(["snapshot","project_sync","invite_create","invite_decide","version_checkpoint","version_private_test","review_submit","moderation_decide"]);
class Failure extends Error { constructor(public status:number, message:string){ super(message); } }
const hex = (bytes:Uint8Array) => Array.from(bytes, byte => byte.toString(16).padStart(2,"0")).join("");
const sha256 = async (value:string) => hex(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value))));

async function rpc(authorization:string,name:string,body:unknown={}){
  const response=await fetch(`${BASE}/rest/v1/rpc/${name}`,{
    method:"POST",
    headers:{apikey:PUBLIC,Authorization:authorization,"Content-Type":"application/json"},
    body:JSON.stringify(body),
    signal:AbortSignal.timeout(12000),
  });
  const data=await response.json().catch(()=>null);
  if(!response.ok){
    const code=String(data?.message||data?.code||"");
    if(code.includes("authentication_required")||code.includes("passport_required"))throw new Failure(401,"Connecte ton Passeport 3B staging.");
    if(code.includes("rate_limited"))throw new Failure(429,"Patiente un instant.");
    throw new Failure(response.status>=500?503:400,"Nosbloc staging n’a pas abouti.");
  }
  return data;
}

async function authenticate(req:Request){
  const header=req.headers.get("authorization")||"";
  if(!header.startsWith("Bearer "))throw new Failure(401,"Connecte-toi à ton compte 3B.");
  const response=await fetch(`${BASE}/auth/v1/user`,{headers:{apikey:PUBLIC,Authorization:header},signal:AbortSignal.timeout(10000)});
  const user=await response.json().catch(()=>null);
  if(!response.ok||!user?.id)throw new Failure(401,"Ta session a expiré.");
  return {uid:String(user.id),authorization:header};
}

async function readJson(req:Request){
  if(!req.headers.get("content-type")?.startsWith("application/json"))throw new Failure(415,"Format invalide.");
  const reader=req.body?.getReader(),decoder=new TextDecoder();let text="",bytes=0;
  if(reader)try{while(true){const part=await reader.read();if(part.done)break;bytes+=part.value.byteLength;if(bytes>524288){await reader.cancel();throw new Failure(413,"Projet trop volumineux.");}text+=decoder.decode(part.value,{stream:true});}text+=decoder.decode();}finally{reader.releaseLock();}
  try{return JSON.parse(text);}catch{throw new Failure(400,"Demande invalide.");}
}

Deno.serve(async req=>{
  const origin=req.headers.get("origin")||"";
  const cors={...(ORIGINS.has(origin)?{"Access-Control-Allow-Origin":origin}:{}),"Access-Control-Allow-Headers":"authorization,apikey,content-type,x-client-info","Access-Control-Allow-Methods":"POST,OPTIONS","Cache-Control":"no-store",Vary:"Origin"};
  const reply=(body:unknown,status=200)=>Response.json(body,{status,headers:cors});
  if(req.method==="OPTIONS")return new Response(null,{status:204,headers:cors});
  if(req.method!=="POST")return reply({error:"Méthode non autorisée."},405);
  if(origin&&!ORIGINS.has(origin))return reply({error:"Origine non autorisée."},403);
  try{
    if(!ENABLED)throw new Failure(503,"Nosbloc staging n’est pas activé sur cet environnement.");
    const {authorization}=await authenticate(req),body=await readJson(req),action=String(body?.action||"");
    if(!ACTIONS.has(action))throw new Failure(400,"Action staging inconnue.");
    if(action==="snapshot")return reply(await rpc(authorization,"nosbloc_stg_snapshot_api"));
    if(action==="project_sync"){
      const validation=validateProjectPayload(body.project);
      if(!validation.valid)throw new Failure(400,`Projet incomplet : ${validation.errors.join(", ")}.`);
      return reply(await rpc(authorization,"nosbloc_stg_sync_project_api",{p_client_project:validation.payload.clientProjectId,p_payload:validation.payload,p_idempotency:normalizeUuid(body.idempotency,"Requête")}));
    }
    if(action==="invite_create")return reply(await rpc(authorization,"nosbloc_stg_invite_api",{p_project:normalizeUuid(body.projectId,"Projet"),p_member_key:String(body.memberKey||"").slice(0,80),p_handle:normalizeMemberHandle(body.handle),p_role:String(body.role||"Création").slice(0,50),p_share_bps:Math.max(0,Math.min(10000,Math.round(Number(body.shareBps)||0))),p_idempotency:normalizeUuid(body.idempotency,"Requête")}));
    if(action==="invite_decide")return reply(await rpc(authorization,"nosbloc_stg_decide_invitation_api",{p_invitation:normalizeUuid(body.invitationId,"Invitation"),p_accept:body.accept===true,p_idempotency:normalizeUuid(body.idempotency,"Requête")}));
    if(action==="version_checkpoint"||action==="version_private_test"||action==="review_submit"){
      const validation=validateProjectPayload(body.project);
      if(!validation.valid)throw new Failure(400,"Projet incomplet.");
      const stage=normalizeVersionStage(action==="review_submit"?"review":action==="version_private_test"?"private_test":"checkpoint"),snapshot=validation.payload;
      return reply(await rpc(authorization,"nosbloc_stg_create_version_api",{p_project:normalizeUuid(body.projectId,"Projet"),p_stage:stage,p_snapshot:snapshot,p_snapshot_hash:await sha256(stableStringify(snapshot)),p_note:String(body.note||"").slice(0,160),p_idempotency:normalizeUuid(body.idempotency,"Requête")}));
    }
    const decision=normalizeModerationDecision(body.decision);
    return reply(await rpc(authorization,"nosbloc_stg_moderate_api",{p_case:normalizeUuid(body.caseId,"Dossier"),p_decision:decision,p_reason:String(body.reason||"").trim().slice(0,300),p_idempotency:normalizeUuid(body.idempotency,"Requête")}));
  }catch(error){
    return reply({error:error instanceof Failure?error.message:"Nosbloc staging momentanément indisponible."},error instanceof Failure?error.status:503);
  }
});
