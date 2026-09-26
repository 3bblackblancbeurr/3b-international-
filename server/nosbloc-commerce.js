import Stripe from "stripe";
import {createHash, createHmac, randomUUID, timingSafeEqual} from "node:crypto";
import {createMemberCommerce} from "./member-commerce.js";

const INTEGRATION="nosbloc-creator-v2";
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const COUNTRY=/^[A-Z]{2}$/;
const STRIPE_ACCOUNT=/^acct_[A-Za-z0-9]+$/;
const MAX_BODY=16384;

export class NosblocCommerceError extends Error{
 constructor(status,message,code="NOSBLOC_COMMERCE_ERROR"){
  super(message);this.status=status;this.code=code;
 }
}

function json(data,status=200,extra={}){
 return Response.json(data,{status,headers:{
  "Cache-Control":"no-store","X-Content-Type-Options":"nosniff","Referrer-Policy":"no-referrer",...extra,
 }});
}

function safeOrigin(value){
 try{
  const url=new URL(value);
  if((url.protocol!=="https:"&&!(url.protocol==="http:"&&["localhost","127.0.0.1"].includes(url.hostname)))||url.username||url.password)return "";
  return url.origin;
 }catch{return "";}
}

function boolean(value){return String(value||"").toLowerCase()==="true";}
function integer(value,min,max,fallback){
 const number=Number(value);
 if(!Number.isInteger(number)||number<min||number>max)return fallback;
 return number;
}

export function nosblocCommerceConfig(env={}){
 const origin=safeOrigin(env.APP_URL);
 const stripeKey=String(env.STRIPE_SECRET_KEY||"");
 const mode=String(env.NOSBLOC_STRIPE_MODE||"test").toLowerCase()==="live"?"live":"test";
 const keyMatchesMode=mode==="live"?stripeKey.startsWith("sk_live_"):stripeKey.startsWith("sk_test_");
 const storageReady=Boolean(safeOrigin(env.SUPABASE_URL)&&env.SUPABASE_SERVICE_ROLE_KEY);
 const secretsReady=Boolean(stripeKey&&env.NOSBLOC_STRIPE_WEBHOOK_SECRET);
 const baseReady=Boolean(origin&&storageReady&&secretsReady&&keyMatchesMode);
 const commerceEnabled=baseReady&&boolean(env.NOSBLOC_COMMERCE_ENABLED);
 const connectEnabled=commerceEnabled&&boolean(env.NOSBLOC_CONNECT_ENABLED);
 const payoutsEnabled=connectEnabled&&boolean(env.NOSBLOC_PAYOUTS_ENABLED);
 return{
  origin,mode,livemode:mode==="live",baseReady,commerceEnabled,connectEnabled,payoutsEnabled,
  automaticTax:boolean(env.NOSBLOC_AUTOMATIC_TAX),
  defaultPlatformFeeBps:integer(env.NOSBLOC_PLATFORM_FEE_BPS,0,5000,1000),
 };
}

async function readJson(request,maxBytes=MAX_BODY){
 const length=Number(request.headers.get("content-length")||0);
 if(length>maxBytes)throw new NosblocCommerceError(413,"Requête trop volumineuse.");
 if(!request.body)return{};
 const reader=request.body.getReader();
 const chunks=[];let size=0;
 for(;;){
  const {value,done}=await reader.read();
  if(done)break;
  size+=value.length;
  if(size>maxBytes){await reader.cancel();throw new NosblocCommerceError(413,"Requête trop volumineuse.");}
  chunks.push(Buffer.from(value));
 }
 try{return JSON.parse(Buffer.concat(chunks).toString("utf8")||"{}");}
 catch{throw new NosblocCommerceError(400,"Demande JSON invalide.");}
}

function checkoutCookieName(id){
 return "nb3b_"+createHash("sha256").update(id).digest("hex").slice(0,18);
}
function checkoutCookieValue(id,key){
 return createHmac("sha256",key).update("nosbloc-checkout:"+id).digest("hex");
}
function validCheckoutCookie(request,id,key){
 const cookie=(request.headers.get("cookie")||"").split(";").map(row=>row.trim().split("="));
 const actual=cookie.find(([name])=>name===checkoutCookieName(id))?.[1]||"";
 const expected=checkoutCookieValue(id,key);
 return /^[a-f0-9]{64}$/.test(actual)&&timingSafeEqual(Buffer.from(actual),Buffer.from(expected));
}

function stripeAccountUrl(value){
 try{
  const url=new URL(value);
  return url.protocol==="https:"&&(url.hostname==="connect.stripe.com"||url.hostname.endsWith(".stripe.com"))?url.href:"";
 }catch{return "";}
}

function transferCapability(account){
 return account?.configuration?.recipient?.capabilities?.stripe_balance?.stripe_transfers?.status
  ||account?.configuration?.recipient?.capabilities?.stripe_transfers?.status
  ||"unknown";
}

function payoutCapability(account){
 return account?.configuration?.recipient?.capabilities?.stripe_balance?.payouts?.status
  ||account?.configuration?.recipient?.capabilities?.payouts?.status
  ||"unknown";
}

function requirementsCount(account){
 const values=[
  account?.requirements?.currently_due,
  account?.requirements?.eventually_due,
  account?.configuration?.recipient?.requirements?.currently_due,
 ];
 return Math.max(0,...values.filter(Array.isArray).map(value=>value.length));
}

function accountStatus(account){
 const transfers=transferCapability(account);
 const due=requirementsCount(account);
 if(transfers==="active"&&due===0)return"verified";
 if(["disabled","inactive","restricted"].includes(transfers))return"restricted";
 return"pending";
}

function sha256(value){return createHash("sha256").update(value).digest("hex");}

export function allocateGross(grossCents,recipients,platformFeeBps){
 if(!Number.isSafeInteger(grossCents)||grossCents<=0)throw new Error("gross_invalid");
 const rows=(Array.isArray(recipients)?recipients:[]).map(row=>({
  creatorId:String(row.creator_id||row.creatorId||""),
  shareBps:Number(row.share_bps??row.shareBps),
 }));
 if(!rows.length||rows.some(row=>!UUID.test(row.creatorId)||!Number.isInteger(row.shareBps)||row.shareBps<0||row.shareBps>10000))throw new Error("recipients_invalid");
 if(rows.reduce((sum,row)=>sum+row.shareBps,0)!==10000)throw new Error("shares_invalid");
 let assigned=0;
 return rows.map((row,index)=>{
  const grossShare=index===rows.length-1?grossCents-assigned:Math.floor(grossCents*row.shareBps/10000);
  assigned+=grossShare;
  const fee=Math.floor(grossShare*platformFeeBps/10000);
  return{creator_id:row.creatorId,share_bps:row.shareBps,gross_share_cents:grossShare,platform_fee_cents:fee,creator_net_cents:grossShare-fee};
 });
}

export function createNosblocCommerce({env=process.env,stripe:suppliedStripe,fetcher=fetch,members:suppliedMembers}={}){
 const config=nosblocCommerceConfig(env);
 const members=suppliedMembers||createMemberCommerce({env,fetcher});
 let client=suppliedStripe;

 function stripe(){
  if(!client){
   if(!config.baseReady)throw new NosblocCommerceError(503,"Commerce Nosbloc non configuré.");
   client=new Stripe(env.STRIPE_SECRET_KEY,{timeout:10000,maxNetworkRetries:1});
  }
  return client;
 }

 function serviceHeaders(extra={}){
  return{
   apikey:env.SUPABASE_SERVICE_ROLE_KEY,
   Authorization:`Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
   "Content-Type":"application/json",
   ...extra,
  };
 }

 async function db(path,{method="GET",body,prefer}={}){
  if(!config.baseReady)throw new NosblocCommerceError(503,"Stockage Nosbloc indisponible.");
  const url=new URL(path,env.SUPABASE_URL);
  const response=await fetcher(url,{
   method,
   headers:serviceHeaders(prefer?{Prefer:prefer}:{}),
   ...(body===undefined?{}:{body:JSON.stringify(body)}),
   signal:AbortSignal.timeout(10000),
  });
  const text=await response.text();
  const data=text?JSON.parse(text):null;
  if(!response.ok){
   throw new NosblocCommerceError(503,"Stockage Nosbloc momentanément indisponible.","NOSBLOC_STORAGE");
  }
  return data;
 }

 async function rpc(name,body){
  return db(`/rest/v1/rpc/${name}`,{method:"POST",body});
 }

 async function runtimeConfig(){
  const rows=await db("/rest/v1/nosbloc_commerce_config?singleton=eq.true&select=commerce_enabled,connect_enabled,payouts_enabled,currency,platform_fee_bps");
  const row=rows?.[0];
  return{
   commerce:Boolean(config.commerceEnabled&&row?.commerce_enabled===true),
   connect:Boolean(config.connectEnabled&&row?.connect_enabled===true),
   payouts:Boolean(config.payoutsEnabled&&row?.payouts_enabled===true),
   currency:row?.currency==="eur"?"eur":"eur",
   platformFeeBps:integer(row?.platform_fee_bps,0,5000,config.defaultPlatformFeeBps),
  };
 }

 async function authenticated(request){
  try{
   const member=await members.member(request);
   if(!member?.id||!UUID.test(member.id))throw new Error("invalid");
   return member;
  }catch{
   throw new NosblocCommerceError(401,"Reconnecte-toi à ton compte 3B.","NOSBLOC_AUTH");
  }
 }

 function requireOrigin(request){
  if(request.headers.get("origin")!==config.origin)throw new NosblocCommerceError(403,"Origine de la demande invalide.");
 }

 async function connectedRow(userId){
  const rows=await db(`/rest/v1/nosbloc_connected_accounts?user_id=eq.${encodeURIComponent(userId)}&select=user_id,stripe_account_id,environment,onboarding_status,transfers_enabled,payouts_enabled,requirements_due,country,last_stripe_sync_at`);
  return rows?.[0]||null;
 }

 async function writeConnected(row){
  const rows=await db("/rest/v1/nosbloc_connected_accounts?on_conflict=user_id",{
   method:"POST",body:row,prefer:"resolution=merge-duplicates,return=representation",
  });
  return rows?.[0]||row;
 }

 async function refreshConnected(userId,row){
  if(!row?.stripe_account_id||!STRIPE_ACCOUNT.test(row.stripe_account_id))return row;
  const account=await stripe().v2.core.accounts.retrieve(row.stripe_account_id,{
   include:["configuration.recipient","identity","defaults"],
  });
  const transfers=transferCapability(account)==="active";
  const payouts=payoutCapability(account)==="active";
  return writeConnected({
   user_id:userId,
   stripe_account_id:account.id,
   environment:config.mode,
   onboarding_status:accountStatus(account),
   transfers_enabled:transfers,
   payouts_enabled:payouts,
   requirements_due:requirementsCount(account),
   country:account.identity?.country||row.country||null,
   last_stripe_sync_at:new Date().toISOString(),
   updated_at:new Date().toISOString(),
  });
 }

 async function createConnected(userId,country){
  const normalized=String(country||"FR").trim().toUpperCase();
  if(!COUNTRY.test(normalized))throw new NosblocCommerceError(400,"Pays créateur invalide.");
  const account=await stripe().v2.core.accounts.create({
   dashboard:"express",
   defaults:{responsibilities:{fees_collector:"application",losses_collector:"application"}},
   configuration:{recipient:{capabilities:{stripe_balance:{stripe_transfers:{requested:true}}}}},
   identity:{country:normalized},
   include:["configuration.recipient","identity","defaults"],
  },{idempotencyKey:`nosbloc-connect:${config.mode}:${userId}`});
  if(!STRIPE_ACCOUNT.test(account.id))throw new NosblocCommerceError(503,"Compte créateur Stripe invalide.");
  return writeConnected({
   user_id:userId,stripe_account_id:account.id,environment:config.mode,
   onboarding_status:accountStatus(account),transfers_enabled:transferCapability(account)==="active",
   payouts_enabled:payoutCapability(account)==="active",requirements_due:requirementsCount(account),
   country:normalized,last_stripe_sync_at:new Date().toISOString(),updated_at:new Date().toISOString(),
  });
 }

 async function onboardingLink(row){
  const link=await stripe().v2.core.accountLinks.create({
   account:row.stripe_account_id,
   use_case:{type:"account_onboarding",account_onboarding:{
    configurations:["recipient"],
    return_url:`${config.origin}/?nosbloc_connect=return#nosbloc`,
    refresh_url:`${config.origin}/?nosbloc_connect=refresh#nosbloc`,
   }},
  });
  const url=stripeAccountUrl(link.url);
  if(!url)throw new NosblocCommerceError(503,"Lien de vérification créateur invalide.");
  return url;
 }

 async function product(productId){
  if(!UUID.test(productId))throw new NosblocCommerceError(400,"Produit Nosbloc invalide.");
  const select="product_id,project_id,owner_id,title,description,price_cents,currency,status,version";
  const rows=await db(`/rest/v1/nosbloc_products?product_id=eq.${encodeURIComponent(productId)}&status=eq.active&select=${select}`);
  const item=rows?.[0];
  if(!item||item.currency!=="eur"||!Number.isSafeInteger(item.price_cents)||item.price_cents<=0)throw new NosblocCommerceError(409,"Cette création n’est pas disponible à l’achat.");
  return item;
 }

 async function recipients(productId){
  const rows=await db(`/rest/v1/nosbloc_product_recipients?product_id=eq.${encodeURIComponent(productId)}&select=creator_id,share_bps&order=creator_id.asc`);
  if(!Array.isArray(rows)||!rows.length)throw new NosblocCommerceError(409,"Le partage créateur de cette création n’est pas prêt.");
  if(rows.reduce((sum,row)=>sum+Number(row.share_bps||0),0)!==10000)throw new NosblocCommerceError(409,"Le partage créateur doit totaliser 100 %.");
  return rows;
 }

 async function creatorsReady(rows){
  const ids=rows.map(row=>row.creator_id);
  const filter=ids.join(",");
  const connected=await db(`/rest/v1/nosbloc_connected_accounts?user_id=in.(${filter})&select=user_id,stripe_account_id,onboarding_status,transfers_enabled,payouts_enabled`);
  const map=new Map((connected||[]).map(row=>[row.user_id,row]));
  return rows.every(row=>{
   const account=map.get(row.creator_id);
   return account&&STRIPE_ACCOUNT.test(account.stripe_account_id||"")&&account.onboarding_status==="verified"&&account.transfers_enabled===true;
  });
 }

 async function insertOrder(order,allocations){
  await db("/rest/v1/nosbloc_orders",{method:"POST",body:order,prefer:"return=minimal"});
  await db("/rest/v1/nosbloc_order_allocations",{method:"POST",body:allocations,prefer:"return=minimal"});
 }

 async function updateOrderSession(orderId,session){
  const intent=typeof session.payment_intent==="string"?session.payment_intent:session.payment_intent?.id;
  await db(`/rest/v1/nosbloc_orders?order_id=eq.${encodeURIComponent(orderId)}`,{
   method:"PATCH",
   body:{stripe_session_id:session.id,payment_intent_id:intent||null,updated_at:new Date().toISOString()},
   prefer:"return=minimal",
  });
 }

 async function authoritativeSession(sessionId){
  if(!/^cs_(test_|live_)?[A-Za-z0-9]+$/.test(sessionId||""))throw new NosblocCommerceError(400,"Session Stripe invalide.");
  return stripe().checkout.sessions.retrieve(sessionId,{expand:["payment_intent"]});
 }

 async function recordPaidSession(event,rawHash,sourceSession){
  const session=await authoritativeSession(sourceSession.id);
  if(session.metadata?.integration!==INTEGRATION||session.mode!=="payment"||session.status!=="complete"||session.payment_status!=="paid")return{ignored:true};
  if(Boolean(session.livemode)!==config.livemode||session.currency!=="eur"||!Number.isSafeInteger(session.amount_total)||session.amount_total<=0)throw new NosblocCommerceError(409,"État de paiement Nosbloc incohérent.");
  const orderId=session.metadata?.order_id||"";
  if(!UUID.test(orderId))throw new NosblocCommerceError(409,"Commande Nosbloc invalide.");
  const intent=typeof session.payment_intent==="string"?session.payment_intent:session.payment_intent?.id;
  if(!/^pi_[A-Za-z0-9]+$/.test(intent||""))throw new NosblocCommerceError(409,"Paiement Nosbloc invalide.");
  return rpc("nosbloc_record_paid_order_server",{
   p_event_id:event.id,p_event_type:event.type,p_payload_hash:rawHash,p_livemode:Boolean(event.livemode),
   p_order:orderId,p_session:session.id,p_intent:intent,p_gross_cents:session.amount_total,p_currency:session.currency,
  });
 }

 async function recordRefund(event,rawHash,sourceCharge){
  const chargeId=sourceCharge?.id||"";
  if(!/^ch_[A-Za-z0-9]+$/.test(chargeId))return{ignored:true};
  const charge=await stripe().charges.retrieve(chargeId);
  const intent=typeof charge.payment_intent==="string"?charge.payment_intent:charge.payment_intent?.id;
  if(!/^pi_[A-Za-z0-9]+$/.test(intent||""))return{ignored:true};
  if(Boolean(charge.livemode)!==config.livemode||charge.currency!=="eur"||!Number.isSafeInteger(charge.amount_refunded)||charge.amount_refunded<0)throw new NosblocCommerceError(409,"Remboursement Nosbloc incohérent.");
  return rpc("nosbloc_record_refund_server",{
   p_event_id:event.id,p_event_type:event.type,p_payload_hash:rawHash,p_livemode:Boolean(event.livemode),
   p_intent:intent,p_refunded_cents:charge.amount_refunded,p_currency:charge.currency,
  });
 }

 async function recordDispute(event,rawHash,sourceDispute){
  const intent=typeof sourceDispute?.payment_intent==="string"?sourceDispute.payment_intent:sourceDispute?.payment_intent?.id;
  if(!/^pi_[A-Za-z0-9]+$/.test(intent||""))return{ignored:true};
  return rpc("nosbloc_record_dispute_server",{
   p_event_id:event.id,p_event_type:event.type,p_payload_hash:rawHash,p_livemode:Boolean(event.livemode),
   p_intent:intent,p_status:String(sourceDispute.status||"needs_response").slice(0,40),
  });
 }

 function wrap(method,fn,{requiresCommerce=false}={}){
  return async request=>{
   if(request.method!==method)return json({error:"Méthode non autorisée."},405,{Allow:method});
   try{
    if(requiresCommerce&&!config.commerceEnabled)throw new NosblocCommerceError(503,"Commerce Nosbloc fermé pour le moment.");
    return await fn(request);
   }catch(error){
    const known=error instanceof NosblocCommerceError;
    return json({error:known?error.message:"Le service Nosbloc est momentanément indisponible.",code:known?error.code:"NOSBLOC_INTERNAL"},known?error.status:503);
   }
  };
 }

 return{
  publicConfig:wrap("GET",async request=>{
   const member=await authenticated(request);
   const runtime=await runtimeConfig();
   const row=runtime.connect?await connectedRow(member.id):null;
   return json({
    commerceEnabled:runtime.commerce,connectEnabled:runtime.connect,payoutsEnabled:runtime.payouts,
    testMode:!config.livemode,currency:"EUR",platformFeeBps:runtime.platformFeeBps,
    creator:row?{status:row.onboarding_status,transfersEnabled:row.transfers_enabled,payoutsEnabled:row.payouts_enabled,requirementsDue:row.requirements_due}:null,
   });
  }),

  connect:wrap("POST",async request=>{
   requireOrigin(request);
   const member=await authenticated(request);
   const runtime=await runtimeConfig();
   if(!runtime.connect)throw new NosblocCommerceError(503,"Vérification créateur non ouverte.");
   const body=await readJson(request);
   let row=await connectedRow(member.id);
   if(row?.stripe_account_id)row=await refreshConnected(member.id,row);
   else row=await createConnected(member.id,body.country);
   const url=await onboardingLink(row);
   return json({url,status:row.onboarding_status,testMode:!config.livemode});
  },{requiresCommerce:true}),

  creatorStatus:wrap("GET",async request=>{
   const member=await authenticated(request);
   const runtime=await runtimeConfig();
   let row=await connectedRow(member.id);
   if(row?.stripe_account_id&&runtime.connect)row=await refreshConnected(member.id,row);
   const balances=await db(`/rest/v1/nosbloc_creator_balances?creator_id=eq.${encodeURIComponent(member.id)}&select=currency,pending_cents,available_cents,paid_out_cents`);
   const balance=balances?.[0]||{currency:"eur",pending_cents:0,available_cents:0,paid_out_cents:0};
   return json({
    real:{currency:"EUR",pendingCents:Number(balance.pending_cents||0),availableCents:Number(balance.available_cents||0),paidOutCents:Number(balance.paid_out_cents||0)},
    creator:row?{status:row.onboarding_status,transfersEnabled:row.transfers_enabled,payoutsEnabled:row.payouts_enabled,requirementsDue:row.requirements_due}:null,
    connectEnabled:runtime.connect,payoutsEnabled:runtime.payouts,testMode:!config.livemode,
   });
  }),

  checkout:wrap("POST",async request=>{
   requireOrigin(request);
   const member=await authenticated(request);
   const runtime=await runtimeConfig();
   if(!runtime.commerce)throw new NosblocCommerceError(503,"Achats Nosbloc non ouverts.");
   const body=await readJson(request);
   if(!UUID.test(body.attemptId||""))throw new NosblocCommerceError(400,"Identifiant de tentative invalide.");
   const item=await product(String(body.productId||""));
   const recipientRows=await recipients(item.product_id);
   if(!await creatorsReady(recipientRows))throw new NosblocCommerceError(409,"Cette création attend encore la vérification de son ou ses créateurs.");
   const allocations=allocateGross(item.price_cents,recipientRows,runtime.platformFeeBps);
   const orderId=randomUUID();
   const transferGroup=`NB3B_${orderId.replaceAll("-","")}`;
   await insertOrder({
    order_id:orderId,buyer_id:member.id,product_id:item.product_id,project_id:item.project_id,
    transfer_group:transferGroup,environment:config.mode,status:"pending",gross_cents:item.price_cents,
    currency:"eur",platform_fee_bps:runtime.platformFeeBps,
   },allocations.map(row=>({...row,allocation_id:randomUUID(),order_id:orderId,transfer_status:"withheld"})));
   const digest=sha256(JSON.stringify({productId:item.product_id,version:item.version,amount:item.price_cents,user:member.id,fee:runtime.platformFeeBps}));
   const session=await stripe().checkout.sessions.create({
    mode:"payment",locale:"fr",
    line_items:[{price_data:{currency:"eur",unit_amount:item.price_cents,product_data:{
     name:item.title,description:String(item.description||"").slice(0,500),
    }},quantity:1}],
    billing_address_collection:"required",
    automatic_tax:{enabled:config.automaticTax},
    consent_collection:{terms_of_service:"required"},
    metadata:{integration:INTEGRATION,order_id:orderId,product_id:item.product_id,project_id:item.project_id},
    payment_intent_data:{transfer_group:transferGroup,metadata:{integration:INTEGRATION,order_id:orderId,product_id:item.product_id,project_id:item.project_id}},
    success_url:`${config.origin}/?nosbloc_checkout=success&session_id={CHECKOUT_SESSION_ID}#nosbloc`,
    cancel_url:`${config.origin}/?nosbloc_checkout=cancel#nosbloc`,
   },{idempotencyKey:`nosbloc:${config.mode}:${body.attemptId}:${digest}`});
   const checkoutUrl=new URL(session.url);
   if(checkoutUrl.origin!=="https://checkout.stripe.com")throw new NosblocCommerceError(503,"Le paiement n’a pas pu être ouvert.");
   await updateOrderSession(orderId,session);
   const secure=config.origin.startsWith("https:")?"; Secure":"";
   return json({url:session.url,sessionId:session.id,orderId,testMode:!config.livemode},200,{
    "Set-Cookie":`${checkoutCookieName(session.id)}=${checkoutCookieValue(session.id,env.STRIPE_SECRET_KEY)}; HttpOnly; SameSite=Lax; Path=/api; Max-Age=86400${secure}`,
   });
  },{requiresCommerce:true}),

  orderStatus:wrap("GET",async request=>{
   const member=await authenticated(request);
   const sessionId=new URL(request.url).searchParams.get("session_id")||"";
   if(!validCheckoutCookie(request,sessionId,env.STRIPE_SECRET_KEY))throw new NosblocCommerceError(403,"Confirmation de paiement non autorisée.");
   const session=await authoritativeSession(sessionId);
   if(session.metadata?.integration!==INTEGRATION)return json({paid:false});
   if(session.metadata?.order_id&&!UUID.test(session.metadata.order_id))return json({paid:false});
   const rows=await db(`/rest/v1/nosbloc_orders?stripe_session_id=eq.${encodeURIComponent(sessionId)}&buyer_id=eq.${encodeURIComponent(member.id)}&select=order_id,status,gross_cents,currency`);
   const order=rows?.[0];
   return json({paid:order?.status==="paid",status:order?.status||"pending",amount:Number(order?.gross_cents||0),currency:String(order?.currency||"eur").toUpperCase()});
  }),

  webhook:wrap("POST",async request=>{
   if(!config.baseReady)throw new NosblocCommerceError(503,"Webhook Nosbloc non configuré.");
   const raw=await request.text();
   if(Buffer.byteLength(raw)>1024*1024)throw new NosblocCommerceError(413,"Webhook trop volumineux.");
   let event;
   try{
    event=stripe().webhooks.constructEvent(raw,request.headers.get("stripe-signature")||"",env.NOSBLOC_STRIPE_WEBHOOK_SECRET);
   }catch{
    throw new NosblocCommerceError(400,"Signature Stripe invalide.");
   }
   if(Boolean(event.livemode)!==config.livemode)return json({received:true,ignored:true});
   const hash=sha256(raw);
   if(["checkout.session.completed","checkout.session.async_payment_succeeded"].includes(event.type)){
    await recordPaidSession(event,hash,event.data.object);
   }else if(["charge.refunded","refund.updated"].includes(event.type)){
    const object=event.data.object;
    const charge=event.type==="refund.updated"&&typeof object.charge==="string"?{id:object.charge}:object;
    await recordRefund(event,hash,charge);
   }else if(event.type==="charge.dispute.created"){
    await recordDispute(event,hash,event.data.object);
   }else{
    return json({received:true,ignored:true});
   }
   return json({received:true});
  }),

  processTransfers:async(limit=20)=>{
   const runtime=await runtimeConfig();
   if(!runtime.payouts)throw new NosblocCommerceError(503,"Versements Nosbloc verrouillés.");
   const batch=Math.max(1,Math.min(100,Number(limit)||20));
   await rpc("nosbloc_release_eligible_allocations_server",{p_limit:batch});
   const rows=await db(`/rest/v1/nosbloc_order_allocations?transfer_status=eq.ready&select=allocation_id,order_id,creator_id,creator_net_cents&limit=${batch}`);
   const results=[];
   for(const allocation of rows||[]){
    const connected=await connectedRow(allocation.creator_id);
    if(!connected||connected.onboarding_status!=="verified"||connected.transfers_enabled!==true||!STRIPE_ACCOUNT.test(connected.stripe_account_id||"")){
     results.push({allocationId:allocation.allocation_id,status:"blocked"});
     continue;
    }
    const orderRows=await db(`/rest/v1/nosbloc_orders?order_id=eq.${encodeURIComponent(allocation.order_id)}&select=transfer_group,currency,status`);
    const order=orderRows?.[0];
    if(!order||order.status!=="paid"||order.currency!=="eur"){results.push({allocationId:allocation.allocation_id,status:"blocked"});continue;}
    const transfer=await stripe().transfers.create({
     amount:allocation.creator_net_cents,currency:"eur",destination:connected.stripe_account_id,
     transfer_group:order.transfer_group,metadata:{integration:INTEGRATION,allocation_id:allocation.allocation_id,order_id:allocation.order_id},
    },{idempotencyKey:`nosbloc-transfer:${allocation.allocation_id}`});
    await rpc("nosbloc_record_transfer_server",{p_allocation:allocation.allocation_id,p_transfer:transfer.id,p_amount_cents:allocation.creator_net_cents});
    results.push({allocationId:allocation.allocation_id,status:"transferred"});
   }
   return results;
  },
 };
}
