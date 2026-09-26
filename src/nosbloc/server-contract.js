const TYPES=new Set(["world","game","story","fashion","music","shop"]);
const STAGES=new Set(["checkpoint","private_test","review"]);
const clampText=(value,max)=>String(value||"").trim().slice(0,max);
const integer=(value,min,max)=>Math.min(max,Math.max(min,Math.round(Number(value)||0)));

export function normalizeProjectPayload(source={}){
 const splits=(Array.isArray(source.splits)?source.splits:[]).slice(0,20).map((row,index)=>({
  memberKey:clampText(row?.memberKey||row?.id||`member-${index+1}`,80),
  name:clampText(row?.name||"Membre",50),
  role:clampText(row?.role||"Création",50),
  shareBps:integer(row?.shareBps,0,10000),
  localStatus:["owner","draft","invited","accepted"].includes(row?.localStatus||row?.status)?(row.localStatus||row.status):"draft",
 })).filter(row=>row.memberKey&&row.name);
 const type=TYPES.has(source.type)?source.type:"world";
 return {
  clientProjectId:clampText(source.id||source.clientProjectId,100),
  title:clampText(source.title,80),
  type,
  template:clampText(source.template,100),
  description:clampText(source.description,2000),
  audience:clampText(source.audience||"Tout public",60),
  creationMode:["ai","template","blank","import"].includes(source.creationMode)?source.creationMode:"template",
  platforms:{mobile:source.platforms?.mobile!==false,web:source.platforms?.web!==false,pc:source.platforms?.pc===true},
  safety:{moderation:source.safety?.moderation===true,cosmeticFirst:source.safety?.cosmeticFirst!==false,ageGate:clampText(source.safety?.ageGate||"Tout public",40)},
  rights:{
   contentOwned:source.rights?.coreOwned===true||source.rights?.contentOwned===true,
   thirdPartyLicensed:source.rights?.thirdPartyLicensed===true,
   audienceReviewed:source.rights?.ageRatingReviewed===true||source.rights?.audienceReviewed===true,
  },
  splits,
  plan:(Array.isArray(source.plan)?source.plan:[]).slice(0,60).map(item=>({id:clampText(item?.id,80),title:clampText(item?.title,140),done:item?.done===true})),
  licensedAssets:[...new Set((Array.isArray(source.licensedAssets)?source.licensedAssets:[]).map(value=>clampText(value,100)).filter(Boolean))].slice(0,100),
 };
}

export function validateProjectPayload(project){
 const payload=normalizeProjectPayload(project);
 const totalBps=payload.splits.reduce((sum,row)=>sum+row.shareBps,0);
 const errors=[];
 if(payload.clientProjectId.length<3)errors.push("client_project_id");
 if(payload.title.length<3)errors.push("title");
 if(payload.description.length<40)errors.push("description");
 if(!payload.template)errors.push("template");
 if(!payload.safety.moderation)errors.push("moderation");
 if(payload.splits.length<1||totalBps!==10000)errors.push("splits");
 return {valid:errors.length===0,errors,totalBps,payload};
}

export function normalizeVersionStage(value){
 const stage=String(value||"");
 if(!STAGES.has(stage))throw new Error("Étape de version invalide.");
 return stage;
}
