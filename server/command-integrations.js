import Stripe from "stripe";

const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ORIGINS=new Set([
 "https://3b-international.vercel.app",
 "capacitor://localhost",
 "https://localhost",
 "http://localhost:5173",
 "http://127.0.0.1:5173"
]);
const MAX_AI_CHARS=4000;
const TIMEOUT=9000;

class IntegrationError extends Error{
 constructor(status,message){super(message);this.status=status;}
}

function safeOrigin(value){
 try{
  const url=new URL(value);
  return url.protocol==="https:"?url.origin:"";
 }catch{return "";}
}

function json(data,status=200,origin=""){
 return Response.json(data,{status,headers:{
  "Cache-Control":"no-store",
  "X-Content-Type-Options":"nosniff",
  "Referrer-Policy":"no-referrer",
  "Vary":"Origin",
  ...(ORIGINS.has(origin)?{"Access-Control-Allow-Origin":origin}:{})
 }});
}

function config(env){
 const base=safeOrigin(env.SUPABASE_URL);
 const key=env.SUPABASE_SERVICE_ROLE_KEY||"";
 if(!base||!key)throw new IntegrationError(503,"Configuration propriétaire incomplète.");
 return{base,key};
}

async function serviceFetch(env,fetcher,path,{method="GET",body}={}){
 const{base,key}=config(env);
 const response=await fetcher(new URL(path,base),{
  method,
  signal:AbortSignal.timeout(TIMEOUT),
  headers:{apikey:key,Authorization:`Bearer ${key}`,"Content-Type":"application/json"},
  ...(body===undefined?{}:{body:JSON.stringify(body)})
 });
 if(!response.ok)throw new IntegrationError(503,"Service propriétaire indisponible.");
 return response.status===204?null:response.json().catch(()=>null);
}

function sessionIdFromJwt(token){
 try{return JSON.parse(Buffer.from(token.split(".")[1]||"","base64url").toString("utf8"))?.session_id||"";}
 catch{return "";}
}

async function authOwner(request,env,fetcher){
 const auth=request.headers.get("authorization")||"";
 if(!auth.startsWith("Bearer ")||auth.length>4096)throw new IntegrationError(401,"Connexion requise.");
 const{base,key}=config(env);
 const response=await fetcher(new URL("/auth/v1/user",base),{
  signal:AbortSignal.timeout(TIMEOUT),
  headers:{apikey:key,Authorization:auth}
 });
 if(!response.ok)throw new IntegrationError(401,"Session invalide.");
 const user=await response.json().catch(()=>null);
 if(!UUID.test(user?.id||""))throw new IntegrationError(401,"Session invalide.");
 const sessionId=sessionIdFromJwt(auth.slice(7));
 if(!UUID.test(sessionId))throw new IntegrationError(401,"Session invalide.");
 const valid=await serviceFetch(env,fetcher,"/rest/v1/rpc/loyalty_session_valid",{
  method:"POST",body:{p_user:user.id,p_session:sessionId}
 });
 if(valid!==true)throw new IntegrationError(401,"Session expirée.");
 const rows=await serviceFetch(env,fetcher,"/rest/v1/control_center_settings?singleton=eq.true&select=enabled,owner_email,owner_user_id&limit=1");
 const owner=rows?.[0];
 if(!owner?.enabled)throw new IntegrationError(503,"Command OS désactivé.");
 const ownerId=String(owner.owner_user_id||"").trim();
 const ownerEmail=String(owner.owner_email||"").trim().toLowerCase();
 const email=String(user.email||"").trim().toLowerCase();
 if(ownerId?user.id!==ownerId:(!ownerEmail||email!==ownerEmail))throw new IntegrationError(403,"Command OS réservé au propriétaire 3B.");
 if(!user.email_confirmed_at)throw new IntegrationError(403,"Confirme ton adresse e-mail.");
 return user;
}

async function rateLimit(uid,env,fetcher,key,limit=8,window=60){
 const allowed=await serviceFetch(env,fetcher,"/rest/v1/rpc/loyalty_rate",{
  method:"POST",body:{p_key:`${uid}:command-integrations:${key}`,p_limit:limit,p_window:window}
 });
 if(allowed!==true)throw new IntegrationError(429,"Trop de demandes. Réessaie dans un instant.");
}

function setup(missing,detail){
 return{state:"setup_required",detail,missing};
}
function failed(detail){
 return{state:"error",detail};
}
function clampText(value,max=160){
 const text=String(value||"").replace(/[\r\n\t]+/g," ").trim();
 return text.length>max?text.slice(0,max-1)+"…":text;
}
async function readJson(fetcher,url,options={}){
 const response=await fetcher(url,{...options,signal:AbortSignal.timeout(TIMEOUT)});
 if(!response.ok)throw new Error("provider");
 return response.json().catch(()=>{throw new Error("provider");});
}

async function googleAccessToken(env,fetcher){
 const required=["COMMAND_GOOGLE_CLIENT_ID","COMMAND_GOOGLE_CLIENT_SECRET","COMMAND_GOOGLE_REFRESH_TOKEN"];
 const missing=required.filter(name=>!env[name]);
 if(missing.length)return{missing};
 const body=new URLSearchParams({
  client_id:env.COMMAND_GOOGLE_CLIENT_ID,
  client_secret:env.COMMAND_GOOGLE_CLIENT_SECRET,
  refresh_token:env.COMMAND_GOOGLE_REFRESH_TOKEN,
  grant_type:"refresh_token"
 });
 try{
  const payload=await readJson(fetcher,"https://oauth2.googleapis.com/token",{
   method:"POST",
   headers:{"Content-Type":"application/x-www-form-urlencoded"},
   body:body.toString()
  });
  if(!payload?.access_token)throw new Error("provider");
  return{token:payload.access_token};
 }catch{return{error:true};}
}

async function googleProvider(env,fetcher){
 const access=await googleAccessToken(env,fetcher);
 if(access.missing)return setup(access.missing,"Autorisation Google Workspace requise côté serveur.");
 if(access.error)return failed("Autorisation Google à renouveler.");
 const headers={Authorization:`Bearer ${access.token}`};
 const gmailUrl=new URL("https://gmail.googleapis.com/gmail/v1/users/me/messages");
 gmailUrl.searchParams.set("maxResults","1");
 gmailUrl.searchParams.set("q","is:unread in:inbox -category:promotions -in:spam -in:trash");
 const calendarUrl=new URL("https://www.googleapis.com/calendar/v3/calendars/primary/events");
 calendarUrl.searchParams.set("timeMin",new Date().toISOString());
 calendarUrl.searchParams.set("maxResults","5");
 calendarUrl.searchParams.set("singleEvents","true");
 calendarUrl.searchParams.set("orderBy","startTime");

 const [gmail,calendar]=await Promise.allSettled([
  readJson(fetcher,gmailUrl,{headers}),
  readJson(fetcher,calendarUrl,{headers})
 ]);
 const gmailData=gmail.status==="fulfilled"?{
  state:"live",
  unread:Number.isFinite(Number(gmail.value?.resultSizeEstimate))?Number(gmail.value.resultSizeEstimate):0
 }:{state:"error"};
 const items=calendar.status==="fulfilled"&&Array.isArray(calendar.value?.items)?calendar.value.items:[];
 const calendarData=calendar.status==="fulfilled"?{
  state:"live",
  upcoming:items.length,
  events:items.slice(0,3).map(event=>({
   title:clampText(event.summary||"Événement",120),
   start:event.start?.dateTime||event.start?.date||null,
   end:event.end?.dateTime||event.end?.date||null
  }))
 }:{state:"error",upcoming:0,events:[]};
 return{
  state:gmailData.state==="live"||calendarData.state==="live"?"live":"error",
  detail:"Google Workspace propriétaire",
  gmail:gmailData,
  calendar:calendarData
 };
}

function networkNames(profile){
 const data=profile&&typeof profile.networksData==="object"?profile.networksData:{};
 return Object.entries(data)
  .filter(([,value])=>value!==null&&value!==undefined&&value!==""&&value!==false)
  .map(([key])=>key.replace(/Data$/,""))
  .slice(0,20);
}

async function metricoolProvider(env,fetcher){
 const required=["COMMAND_METRICOOL_TOKEN","COMMAND_METRICOOL_USER_ID","COMMAND_METRICOOL_BLOG_ID"];
 const missing=required.filter(name=>!env[name]);
 if(missing.length)return setup(missing,"Jeton API Metricool + userId + blogId requis.");
 const url=new URL("https://app.metricool.com/api/admin/simpleProfiles");
 url.searchParams.set("userId",env.COMMAND_METRICOOL_USER_ID);
 url.searchParams.set("blogId",env.COMMAND_METRICOOL_BLOG_ID);
 try{
  const payload=await readJson(fetcher,url,{headers:{"X-Mc-Auth":env.COMMAND_METRICOOL_TOKEN,"Content-Type":"application/json"}});
  const rows=Array.isArray(payload)?payload:[];
  const wanted=String(env.COMMAND_METRICOOL_BLOG_ID);
  const profile=rows.find(row=>String(row?.id??row?.blogId??"")===wanted);
  if(!profile)return failed("Marque Metricool introuvable pour les identifiants configurés.");
  return{
   state:"live",
   detail:"Metricool API",
   brand:clampText(profile.label||profile.name||"3B",80),
   networks:networkNames(profile)
  };
 }catch{return failed("Metricool API indisponible ou jeton invalide.");}
}

function moneyRows(rows){
 return(Array.isArray(rows)?rows:[]).slice(0,10).map(row=>({
  currency:String(row.currency||"").toUpperCase(),
  amount:Number.isSafeInteger(row.amount)?row.amount:0
 }));
}

async function stripeProvider(env,stripeFactory){
 if(!env.STRIPE_SECRET_KEY)return setup(["STRIPE_SECRET_KEY"],"Clé Stripe serveur requise.");
 try{
  const stripe=stripeFactory(env.STRIPE_SECRET_KEY);
  const balance=await stripe.balance.retrieve();
  const live=balance?.livemode===true||String(env.STRIPE_SECRET_KEY).startsWith("sk_live_");
  return{
   state:live?"live":"test",
   detail:live?"Stripe LIVE":"Stripe TEST — aucun solde bancaire réel",
   livemode:live,
   available:moneyRows(balance?.available),
   pending:moneyRows(balance?.pending)
  };
 }catch{return failed("Stripe ne répond pas avec la clé serveur configurée.");}
}

async function vercelProvider(env,fetcher){
 const required=["COMMAND_VERCEL_TOKEN","COMMAND_VERCEL_PROJECT_ID"];
 const missing=required.filter(name=>!env[name]);
 if(missing.length)return setup(missing,"Jeton Vercel et Project ID requis côté serveur.");
 const url=new URL("https://api.vercel.com/v6/deployments");
 url.searchParams.set("projectId",env.COMMAND_VERCEL_PROJECT_ID);
 url.searchParams.set("limit","5");
 if(env.COMMAND_VERCEL_TEAM_ID)url.searchParams.set("teamId",env.COMMAND_VERCEL_TEAM_ID);
 try{
  const payload=await readJson(fetcher,url,{headers:{Authorization:`Bearer ${env.COMMAND_VERCEL_TOKEN}`}});
  const rows=Array.isArray(payload?.deployments)?payload.deployments:[];
  const latest=rows[0]||null;
  return{
   state:"live",
   detail:"Vercel REST API",
   deployments:rows.length,
   latest:latest?{
    state:clampText(latest.state||latest.readyState||"UNKNOWN",40),
    target:clampText(latest.target||"",40),
    created_at:Number.isFinite(Number(latest.createdAt))?new Date(Number(latest.createdAt)).toISOString():null,
    ready_at:Number.isFinite(Number(latest.ready))?new Date(Number(latest.ready)).toISOString():null
   }:null
  };
 }catch{return failed("Vercel API indisponible ou jeton invalide.");}
}

function openAIProvider(env){
 const missing=["OPENAI_API_KEY","COMMAND_AI_MODEL"].filter(name=>!env[name]);
 if(missing.length)return setup(missing,"Clé OpenAI et modèle Command IA requis.");
 return{state:"configured",detail:"OpenAI Responses API",model:clampText(env.COMMAND_AI_MODEL,80)};
}

async function providers(env,fetcher,stripeFactory){
 const [google,metricool,stripe,vercel]=await Promise.all([
  googleProvider(env,fetcher),
  metricoolProvider(env,fetcher),
  stripeProvider(env,stripeFactory),
  vercelProvider(env,fetcher)
 ]);
 return{google,metricool,stripe,vercel,openai:openAIProvider(env)};
}

function providerContext(data){
 const google=data.google||{};
 const stripe=data.stripe||{};
 const metricool=data.metricool||{};
 const vercel=data.vercel||{};
 return{
  gmail_unread:google.gmail?.state==="live"?google.gmail.unread:null,
  calendar_upcoming:google.calendar?.state==="live"?google.calendar.upcoming:null,
  social_state:metricool.state,
  social_networks:Array.isArray(metricool.networks)?metricool.networks:[],
  stripe_state:stripe.state,
  stripe_livemode:stripe.livemode===true,
  vercel_state:vercel.state,
  latest_deployment_state:vercel.latest?.state||null
 };
}

function outputText(payload){
 if(typeof payload?.output_text==="string"&&payload.output_text.trim())return payload.output_text.trim();
 const parts=[];
 for(const item of Array.isArray(payload?.output)?payload.output:[]){
  if(item?.type!=="message")continue;
  for(const content of Array.isArray(item?.content)?item.content:[]){
   if(content?.type==="output_text"&&typeof content.text==="string")parts.push(content.text);
  }
 }
 return parts.join("\n").trim();
}

async function aiCommand(prompt,providerData,env,fetcher){
 if(!env.OPENAI_API_KEY||!env.COMMAND_AI_MODEL)throw new IntegrationError(503,"3B IA Command n’est pas encore configuré.");
 const clean=String(prompt||"").trim();
 if(!clean||clean.length>MAX_AI_CHARS)throw new IntegrationError(400,"Demande IA invalide ou trop longue.");
 const context=JSON.stringify(providerContext(providerData));
 const response=await fetcher("https://api.openai.com/v1/responses",{
  method:"POST",
  signal:AbortSignal.timeout(20000),
  headers:{Authorization:`Bearer ${env.OPENAI_API_KEY}`,"Content-Type":"application/json"},
  body:JSON.stringify({
   model:env.COMMAND_AI_MODEL,
   store:false,
   max_output_tokens:700,
   instructions:"Tu es 3B IA Command, assistant privé du propriétaire 3B. Réponds en français, de façon courte, opérationnelle et factuelle. N’invente jamais de donnée absente. Si un service est en setup_required, dis qu’il n’est pas encore connecté. Ne révèle jamais de secret, clé, token ou identifiant technique sensible.",
   input:`État réel disponible: ${context}\n\nDemande propriétaire: ${clean}`
  })
 });
 const payload=await response.json().catch(()=>null);
 if(!response.ok)throw new IntegrationError(502,"3B IA Command n’a pas pu répondre.");
 const text=outputText(payload);
 if(!text)throw new IntegrationError(502,"3B IA Command n’a retourné aucun texte.");
 return{text,model:clampText(payload?.model||env.COMMAND_AI_MODEL,80)};
}

export function createCommandIntegrations({
 env=process.env,
 fetcher=fetch,
 stripeFactory=key=>new Stripe(key,{timeout:10000,maxNetworkRetries:1})
}={}){
 return{
  handle:async request=>{
   const origin=request.headers.get("origin")||"";
   const corsHeaders={
    "Access-Control-Allow-Headers":"authorization,content-type",
    "Access-Control-Allow-Methods":"GET,POST,OPTIONS",
    "Cache-Control":"no-store",
    "Vary":"Origin",
    ...(ORIGINS.has(origin)?{"Access-Control-Allow-Origin":origin}:{})
   };
   if(request.method==="OPTIONS")return new Response(null,{status:204,headers:corsHeaders});
   if(origin&&!ORIGINS.has(origin))return json({error:"Origine non autorisée."},403,origin);
   try{
    const user=await authOwner(request,env,fetcher);
    if(request.method==="GET"){
     const data=await providers(env,fetcher,stripeFactory);
     return json({ok:true,server_time:new Date().toISOString(),providers:data},200,origin);
    }
    if(request.method!=="POST")return json({error:"Méthode non autorisée."},405,origin);
    if(!request.headers.get("content-type")?.startsWith("application/json"))throw new IntegrationError(415,"Format invalide.");
    const body=await request.json().catch(()=>{throw new IntegrationError(400,"JSON invalide.");});
    const action=String(body?.action||"");
    if(action!=="ai")throw new IntegrationError(400,"Action inconnue.");
    await rateLimit(user.id,env,fetcher,"ai",8,60);
    const data=await providers(env,fetcher,stripeFactory);
    const answer=await aiCommand(body?.prompt,data,env,fetcher);
    return json({ok:true,answer,providers:data},200,origin);
   }catch(error){
    const status=error instanceof IntegrationError?error.status:503;
    const message=error instanceof IntegrationError?error.message:"Intégrations Command OS momentanément indisponibles.";
    return json({error:message},status,origin);
   }
  }
 };
}
