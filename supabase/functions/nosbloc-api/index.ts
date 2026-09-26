import {
  newIdempotency, normalizeDecision, normalizeHandle, normalizeProductType,
  normalizeProjectPayload, normalizeStage, normalizeUuid, validateProjectPayload
} from "./contract.js";

const BASE=Deno.env.get("SUPABASE_URL")!;
const PUBLIC=Deno.env.get("SUPABASE_ANON_KEY")!;
const APP_URL=(Deno.env.get("APP_URL")||"https://3b-international.vercel.app").replace(/\/$/,"");
const ORIGINS=new Set([
  APP_URL,"https://localhost","capacitor://localhost",
  "http://localhost:5173","http://127.0.0.1:5173",
  "http://localhost:5174","http://127.0.0.1:5174"
]);
const ACTIONS=new Set([
  "health","snapshot","project_sync","invite_create","invite_decide","invite_revoke","member_remove",
  "version_checkpoint","version_private_test","review_submit","project_versions","version_restore","archive",
  "discover","finance_snapshot","product_create","product_update","product_submit","publish",
  "refund_request","payout_request","moderation_decide","product_moderate"
]);
class Failure extends Error{constructor(public status:number,message:string){super(message);}}

async function rpc(authorization:string,name:string,body:unknown={}){
  const response=await fetch(BASE+"/rest/v1/rpc/"+name,{
    method:"POST",
    headers:{apikey:PUBLIC,Authorization:authorization,"Content-Type":"application/json"},
    body:JSON.stringify(body),
    signal:AbortSignal.timeout(15000)
  });
  const data=await response.json().catch(()=>null);
  if(!response.ok){
    const detail=String(data?.message||data?.code||"");
    if(detail.includes("authentication_required"))throw new Failure(401,"Connecte-toi à ton compte 3B.");
    if(detail.includes("server_disabled"))throw new Failure(503,"Nosbloc Cloud est temporairement désactivé.");
    if(detail.includes("owner_required"))throw new Failure(403,"Action réservée au propriétaire du projet.");
    if(detail.includes("team_not_accepted"))throw new Failure(409,"Tous les membres rémunérés doivent accepter l’équipe avant la révision.");
    if(detail.includes("publication_requirements_missing"))throw new Failure(409,"Les droits, la classification et la modération doivent être validés avant révision.");
    if(detail.includes("discover_disabled"))throw new Failure(423,"Discover reste verrouillé pour le moment.");
    if(detail.includes("payouts_disabled"))throw new Failure(423,"Les versements restent verrouillés tant que les contrôles KYC, fiscaux et Stripe ne sont pas ouverts.");
    if(detail.includes("payout_account_not_ready"))throw new Failure(409,"Le compte de versement n’est pas encore vérifié.");
    if(detail.includes("project_not_publishable"))throw new Failure(409,"Le projet n’est pas encore publiable.");
    if(detail.includes("rate_limited"))throw new Failure(429,"Patiente un instant avant de réessayer.");
    throw new Failure(response.status>=500?503:400,"L’opération Nosbloc n’a pas abouti.");
  }
  return data;
}
async function authenticate(req:Request){
  const authorization=req.headers.get("authorization")||"";
  if(!authorization.startsWith("Bearer "))throw new Failure(401,"Connecte-toi à ton compte 3B.");
  const response=await fetch(BASE+"/auth/v1/user",{headers:{apikey:PUBLIC,Authorization:authorization},signal:AbortSignal.timeout(10000)});
  const user=await response.json().catch(()=>null);
  if(!response.ok||!user?.id)throw new Failure(401,"Ta session a expiré. Reconnecte-toi.");
  return {uid:String(user.id),authorization};
}
async function readJson(req:Request){
  if(!req.headers.get("content-type")?.startsWith("application/json"))throw new Failure(415,"Format invalide.");
  const reader=req.body?.getReader(),decoder=new TextDecoder();let text="",bytes=0;
  if(reader)try{
    while(true){
      const part=await reader.read();if(part.done)break;
      bytes+=part.value.byteLength;
      if(bytes>1048576){await reader.cancel();throw new Failure(413,"Demande Nosbloc trop volumineuse.");}
      text+=decoder.decode(part.value,{stream:true});
    }
    text+=decoder.decode();
  }finally{reader.releaseLock();}
  try{return JSON.parse(text||"{}");}catch{throw new Failure(400,"Demande invalide.");}
}
const money=(value:unknown)=>Math.max(0,Math.round(Number(value)||0));
const text=(value:unknown,max:number)=>String(value||"").trim().slice(0,max);

Deno.serve(async req=>{
  const origin=req.headers.get("origin")||"";
  const cors={
    ...(ORIGINS.has(origin)?{"Access-Control-Allow-Origin":origin}:{}),
    "Access-Control-Allow-Headers":"authorization,apikey,content-type,x-client-info",
    "Access-Control-Allow-Methods":"POST,OPTIONS",
    "Vary":"Origin","Cache-Control":"no-store","X-Content-Type-Options":"nosniff",
    "Referrer-Policy":"no-referrer"
  };
  const reply=(body:unknown,status=200)=>Response.json(body,{status,headers:cors});
  if(req.method==="OPTIONS")return new Response(null,{status:204,headers:cors});
  if(req.method!=="POST")return reply({error:"Méthode non autorisée."},405);
  if(origin&&!ORIGINS.has(origin))return reply({error:"Origine non autorisée."},403);

  try{
    const body=await readJson(req);
    if(!body||typeof body!=="object"||Array.isArray(body))throw new Failure(400,"Demande invalide.");
    const action=String(body.action||"");
    if(!ACTIONS.has(action))throw new Failure(400,"Action Nosbloc inconnue.");
    const {authorization}=await authenticate(req);

    if(action==="health"){
      const snapshot=await rpc(authorization,"nosbloc_snapshot_api");
      return reply({ready:true,runtime:snapshot?.runtime||null});
    }
    if(action==="snapshot")return reply(await rpc(authorization,"nosbloc_snapshot_api"));
    if(action==="finance_snapshot")return reply(await rpc(authorization,"nosbloc_finance_snapshot_api"));
    if(action==="discover")return reply(await rpc(authorization,"nosbloc_discover_api",{
      p_query:text(body.query,120),p_type:text(body.type||"all",20)
    }));

    if(action==="project_sync"){
      const validation=validateProjectPayload(body.project);
      if(!validation.valid)throw new Failure(400,"Projet incomplet : "+validation.errors.join(", ")+".");
      return reply(await rpc(authorization,"nosbloc_sync_project_api",{
        p_client_project:validation.payload.id,
        p_payload:validation.payload,
        p_idempotency:newIdempotency(body.idempotency)
      }));
    }

    if(action==="invite_create")return reply(await rpc(authorization,"nosbloc_invite_api",{
      p_project:normalizeUuid(body.projectId,"Projet"),
      p_member_key:text(body.memberKey,80),
      p_handle:normalizeHandle(body.handle),
      p_role:text(body.role||"Création",50),
      p_share_bps:Math.max(0,Math.min(10000,Math.round(Number(body.shareBps)||0))),
      p_idempotency:newIdempotency(body.idempotency)
    }));
    if(action==="invite_decide")return reply(await rpc(authorization,"nosbloc_decide_invitation_api",{
      p_invitation:normalizeUuid(body.invitationId,"Invitation"),
      p_accept:body.accept===true,
      p_idempotency:newIdempotency(body.idempotency)
    }));
    if(action==="invite_revoke")return reply(await rpc(authorization,"nosbloc_revoke_invitation_api",{
      p_invitation:normalizeUuid(body.invitationId,"Invitation"),
      p_idempotency:newIdempotency(body.idempotency)
    }));
    if(action==="member_remove")return reply(await rpc(authorization,"nosbloc_remove_member_api",{
      p_project:normalizeUuid(body.projectId,"Projet"),
      p_member_key:text(body.memberKey,80),
      p_idempotency:newIdempotency(body.idempotency)
    }));

    if(action==="version_checkpoint"||action==="version_private_test"||action==="review_submit"){
      const validation=validateProjectPayload(body.project);
      if(!validation.valid)throw new Failure(400,"Projet incomplet : "+validation.errors.join(", ")+".");
      const stage=normalizeStage(action==="review_submit"?"review":action==="version_private_test"?"private_test":"checkpoint");
      return reply(await rpc(authorization,"nosbloc_create_version_api",{
        p_project:normalizeUuid(body.projectId,"Projet"),
        p_stage:stage,
        p_snapshot:validation.payload,
        p_note:text(body.note,160),
        p_idempotency:newIdempotency(body.idempotency)
      }));
    }
    if(action==="project_versions")return reply(await rpc(authorization,"nosbloc_project_versions_api",{
      p_project:normalizeUuid(body.projectId,"Projet")
    }));
    if(action==="version_restore")return reply(await rpc(authorization,"nosbloc_restore_version_api",{
      p_project:normalizeUuid(body.projectId,"Projet"),
      p_version:normalizeUuid(body.versionId,"Version"),
      p_idempotency:newIdempotency(body.idempotency)
    }));
    if(action==="archive")return reply(await rpc(authorization,"nosbloc_archive_api",{
      p_project:normalizeUuid(body.projectId,"Projet"),
      p_idempotency:newIdempotency(body.idempotency)
    }));

    if(action==="product_create")return reply(await rpc(authorization,"nosbloc_create_product_api",{
      p_project:body.projectId?normalizeUuid(body.projectId,"Projet"):null,
      p_title:text(body.title,120),
      p_type:normalizeProductType(body.productType),
      p_description:text(body.description,1200),
      p_price_cents:money(body.priceCents),
      p_currency:"EUR",
      p_idempotency:newIdempotency(body.idempotency)
    }));
    if(action==="product_update")return reply(await rpc(authorization,"nosbloc_update_product_api",{
      p_product:normalizeUuid(body.productId,"Produit"),
      p_title:text(body.title,120),
      p_description:text(body.description,1200),
      p_price_cents:money(body.priceCents),
      p_rights_confirmed:body.rightsConfirmed===true,
      p_idempotency:newIdempotency(body.idempotency)
    }));
    if(action==="product_submit")return reply(await rpc(authorization,"nosbloc_submit_product_api",{
      p_product:normalizeUuid(body.productId,"Produit"),
      p_idempotency:newIdempotency(body.idempotency)
    }));

    if(action==="publish")return reply(await rpc(authorization,"nosbloc_publish_api",{
      p_project:normalizeUuid(body.projectId,"Projet"),
      p_idempotency:newIdempotency(body.idempotency)
    }));
    if(action==="refund_request")return reply(await rpc(authorization,"nosbloc_request_refund_api",{
      p_order:normalizeUuid(body.orderId,"Commande"),
      p_amount_cents:money(body.amountCents),
      p_reason:text(body.reason,500),
      p_idempotency:newIdempotency(body.idempotency)
    }));
    if(action==="payout_request")return reply(await rpc(authorization,"nosbloc_request_payout_api",{
      p_amount_cents:money(body.amountCents),
      p_idempotency:newIdempotency(body.idempotency)
    }));

    if(action==="moderation_decide")return reply(await rpc(authorization,"nosbloc_moderate_api",{
      p_case:normalizeUuid(body.caseId,"Dossier"),
      p_decision:normalizeDecision(body.decision),
      p_reason:text(body.reason,300),
      p_idempotency:newIdempotency(body.idempotency)
    }));
    if(action==="product_moderate")return reply(await rpc(authorization,"nosbloc_moderate_product_api",{
      p_product:normalizeUuid(body.productId,"Produit"),
      p_approve:body.approve===true,
      p_reason:text(body.reason,300),
      p_idempotency:newIdempotency(body.idempotency)
    }));

    throw new Failure(400,"Action Nosbloc inconnue.");
  }catch(error){
    const message=error instanceof Failure?error.message:error instanceof Error?error.message:"Service Nosbloc momentanément indisponible.";
    return reply({error:message},error instanceof Failure?error.status:400);
  }
});
