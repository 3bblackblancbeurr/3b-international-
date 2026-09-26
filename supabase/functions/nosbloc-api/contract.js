const TYPES = new Set(["world","game","story","fashion","music","shop"]);
const STAGES = new Set(["checkpoint","private_test","review"]);
const MODERATION = new Set(["approved","rejected"]);
const PRODUCT_TYPES = new Set(["asset","cosmetic","experience","service","other"]);
const clampText = (value,max)=>String(value||"").trim().slice(0,max);
const integer = (value,min,max)=>Math.min(max,Math.max(min,Math.round(Number(value)||0)));

export function normalizeUuid(value,label="Identifiant"){
  const id=String(value||"").trim().toLowerCase();
  if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(id))throw new Error(label+" invalide.");
  return id;
}
export function newIdempotency(value){
  return normalizeUuid(value,"Requête");
}
export function normalizeHandle(value){
  const handle=clampText(value,24).toLocaleLowerCase("fr");
  if(!/^[a-z0-9][a-z0-9._-]{2,23}$/.test(handle))throw new Error("Identifiant 3B invalide.");
  return handle;
}
export function normalizeProjectPayload(source={}){
  const splits=(Array.isArray(source.splits)?source.splits:[]).slice(0,20).map((row,index)=>({
    id:clampText(row?.id||row?.memberKey||`member-${index+1}`,80),
    name:clampText(row?.name||"Membre 3B",50),
    role:clampText(row?.role||"Création",50),
    shareBps:integer(row?.shareBps,0,10000),
    status:["owner","draft","invited","accepted"].includes(row?.status)?row.status:"draft",
  })).filter(row=>row.id&&row.name);
  const type=TYPES.has(source.type)?source.type:"world";
  return {
    id:clampText(source.id||source.clientProjectId,100),
    title:clampText(source.title,80),
    type,
    template:clampText(source.template||"Projet Nosbloc",120),
    description:clampText(source.description,2000),
    audience:clampText(source.audience||"Tout public",60),
    platforms:{
      mobile:source.platforms?.mobile!==false,
      web:source.platforms?.web!==false,
      pc:source.platforms?.pc===true,
    },
    safety:{
      moderation:source.safety?.moderation===true,
      cosmeticFirst:source.safety?.cosmeticFirst!==false,
      ageGate:clampText(source.safety?.ageGate||"Tout public",40),
    },
    rights:{
      coreOwned:source.rights?.coreOwned===true,
      thirdPartyLicensed:source.rights?.thirdPartyLicensed===true,
      ageRatingReviewed:source.rights?.ageRatingReviewed===true,
    },
    splits,
    plan:(Array.isArray(source.plan)?source.plan:[]).slice(0,60).map(item=>({
      id:clampText(item?.id,80),
      title:clampText(item?.title,140),
      detail:clampText(item?.detail,300),
      priority:clampText(item?.priority,20),
      done:item?.done===true,
    })),
    licensedAssets:[...new Set((Array.isArray(source.licensedAssets)?source.licensedAssets:[]).map(v=>clampText(v,100)).filter(Boolean))].slice(0,100),
    scripts:(Array.isArray(source.scripts)?source.scripts:[]).slice(0,40).map((script,index)=>({
      id:clampText(script?.id||`script-${index+1}`,80),
      name:clampText(script?.name||"Script",80),
      language:"javascript",
      source:String(script?.source||"").slice(0,20000),
      enabled:script?.enabled!==false,
    })),
    aiBrief:String(source.aiBrief||"").slice(0,2000),
    server:{readiness:integer(source.server?.readiness,0,100)},
  };
}
export function validateProjectPayload(source){
  const payload=normalizeProjectPayload(source),errors=[];
  const totalBps=payload.splits.reduce((sum,row)=>sum+row.shareBps,0);
  if(!/^[A-Za-z0-9._:-]{3,100}$/.test(payload.id))errors.push("client_project_id");
  if(payload.title.length<3)errors.push("title");
  if(payload.description.length<40)errors.push("description");
  if(!payload.template)errors.push("template");
  if(!payload.safety.moderation)errors.push("moderation");
  if(payload.splits.length<1||totalBps!==10000)errors.push("splits");
  return {valid:errors.length===0,errors,totalBps,payload};
}
export function normalizeStage(value){
  const stage=String(value||"");
  if(!STAGES.has(stage))throw new Error("Étape de version invalide.");
  return stage;
}
export function normalizeDecision(value){
  const decision=String(value||"");
  if(!MODERATION.has(decision))throw new Error("Décision de modération invalide.");
  return decision;
}
export function normalizeProductType(value){
  const type=String(value||"").toLowerCase();
  return PRODUCT_TYPES.has(type)?type:"other";
}
