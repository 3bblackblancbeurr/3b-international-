import Stripe from "stripe";
import {createHash} from "node:crypto";
import {createMemberCommerce} from "./member-commerce.js";

const INTEGRATION="3b-digital-store-v1";
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PRODUCT=/^[A-Z0-9_]{4,80}$/;
const SESSION=/^cs_(test_|live_)?[A-Za-z0-9]+$/;
const PAYMENT_INTENT=/^pi_[A-Za-z0-9]+$/;

export class DigitalStoreError extends Error{
  constructor(status,message){super(message);this.status=status;}
}

function json(data,status=200,extra={}){
  return Response.json(data,{status,headers:{
    "Cache-Control":"no-store","X-Content-Type-Options":"nosniff","Referrer-Policy":"no-referrer",...extra,
  }});
}

function originOf(value){
  try{
    const u=new URL(value);
    if((u.protocol==="https:"||(u.protocol==="http:"&&["localhost","127.0.0.1"].includes(u.hostname)))&&!u.username&&!u.password)return u.origin;
  }catch{}
  return "";
}

function ids(value){
  return new Set(String(value||"").split(",").map(x=>x.trim()).filter(UUID.test.bind(UUID)));
}

export function digitalStoreConfig(env=process.env){
  const origin=originOf(env.APP_URL);
  const secret=String(env.STRIPE_SECRET_KEY||"");
  const mode=secret.startsWith("sk_test_")?"test":secret.startsWith("sk_live_")?"live":"off";
  const testUsers=ids(env.DIGITAL_STORE_TEST_USER_IDS);
  const testEnabled=mode==="test"&&env.DIGITAL_STORE_TEST_ENABLED==="true"&&testUsers.size>0;
  const liveEnabled=mode==="live"&&env.DIGITAL_STORE_LIVE_APPROVED==="true";
  const database=originOf(env.SUPABASE_URL)&&String(env.SUPABASE_SERVICE_ROLE_KEY||"").length>20;
  return{
    origin,mode,testUsers,testEnabled,liveEnabled,database,
    expansionEnabled:env.DIGITAL_STORE_EXPANSION_ENABLED==='true',
    creditSpendEnabled:env.DIGITAL_STORE_CREDIT_SPEND_ENABLED==='true',
    enabled:!!origin&&database&&!!secret&&!!env.STRIPE_WEBHOOK_SECRET&&(testEnabled||liveEnabled),
  };
}

async function readBody(request,max=16384){
  if(Number(request.headers.get("content-length"))>max)throw new DigitalStoreError(413,"Requête trop volumineuse.");
  if(!request.body)return "";
  const reader=request.body.getReader(),chunks=[];let size=0;
  for(;;){
    const {value,done}=await reader.read();if(done)break;
    size+=value.length;if(size>max){await reader.cancel();throw new DigitalStoreError(413,"Requête trop volumineuse.");}
    chunks.push(Buffer.from(value));
  }
  return Buffer.concat(chunks).toString("utf8");
}

export function createDigitalStore({env=process.env,stripe:suppliedStripe,fetcher=fetch}={}){
  const config=digitalStoreConfig(env);
  const commerce=createMemberCommerce({env,fetcher});
  let stripeClient=suppliedStripe;

  function stripe(){
    if(!stripeClient){
      if(!env.STRIPE_SECRET_KEY)throw new DigitalStoreError(503,"Boutique numérique non configurée.");
      stripeClient=new Stripe(env.STRIPE_SECRET_KEY,{timeout:10000,maxNetworkRetries:1});
    }
    return stripeClient;
  }

  async function db(path,{method="GET",body,prefer}={}){
    if(!env.SUPABASE_URL?.startsWith("https://")||!env.SUPABASE_SERVICE_ROLE_KEY)throw new DigitalStoreError(503,"Inventaire 3B indisponible.");
    const response=await fetcher(new URL(path,env.SUPABASE_URL),{
      method,signal:AbortSignal.timeout(10000),
      headers:{
        apikey:env.SUPABASE_SERVICE_ROLE_KEY,
        Authorization:"Bearer "+env.SUPABASE_SERVICE_ROLE_KEY,
        "Content-Type":"application/json",
        ...(prefer?{Prefer:prefer}:{}),
      },
      ...(body===undefined?{}:{body:JSON.stringify(body)}),
    });
    const data=await response.json().catch(()=>null);
    if(!response.ok)throw new DigitalStoreError(503,"Inventaire 3B momentanément indisponible.");
    return data;
  }
  const rpc=(name,body)=>db("/rest/v1/rpc/"+name,{method:"POST",body});

  async function currentMember(request){
    let member;
    try{member=await commerce.member(request);}catch{}
    if(!member?.id)throw new DigitalStoreError(401,"Reconnecte-toi à ton Passeport 3B.");
    return member;
  }

  async function products(scope){
    const safe=["world","city","all"].includes(scope)?scope:"all";
    let query="/rest/v1/digital_store_products?active=eq.true&release_state=in.(test,ready,live)&select=*&order=sort_order.asc";
    if(safe!=="all")query+="&game_scope=in.("+safe+",universal)";
    const rows=await db(query);
    return (Array.isArray(rows)?rows:[]).filter(row=>row.product_kind==='non_consumable'||config.expansionEnabled&&row.product_kind==='consumable');
  }

  async function entitlements(uid){
    const rows=await db("/rest/v1/digital_store_entitlements?user_id=eq."+uid+"&status=eq.active&select=product_code,item_instance_id,status,granted_at");
    return Array.isArray(rows)?rows:[];
  }

  async function product(code){
    if(!PRODUCT.test(code||""))throw new DigitalStoreError(400,"Produit premium invalide.");
    const rows=await db("/rest/v1/digital_store_products?code=eq."+encodeURIComponent(code)+"&active=eq.true&select=*&limit=1");
    const row=Array.isArray(rows)?rows[0]:null;
    if(!row||row.release_state==="retired"||!(row.product_kind==='non_consumable'||config.expansionEnabled&&row.product_kind==='consumable')||row.no_pay_to_win!==true)throw new DigitalStoreError(404,"Produit premium indisponible.");
    return row;
  }

  function allowedForUser(uid,row){
    if(config.mode==="live")return config.liveEnabled&&row.release_state==="live";
    if(config.mode==="test")return config.testEnabled&&config.testUsers.has(uid)&&["test","ready","live"].includes(row.release_state);
    return false;
  }

  async function verifiedPrice(row){
    if(!/^price_[A-Za-z0-9]+$/.test(row.stripe_price_id||""))throw new DigitalStoreError(503,"Prix web non configuré.");
    const price=await stripe().prices.retrieve(row.stripe_price_id,{expand:["product"]});
    const prod=price.product;
    const expectedLive=config.mode==="live";
    if(!price.active||price.type!=="one_time"||price.currency!=="eur"||price.unit_amount!==row.price_cents||price.livemode!==expectedLive
      ||!prod||typeof prod!=="object"||prod.deleted||!prod.active
      ||prod.metadata?.store_code!==row.code||prod.metadata?.no_pay_to_win!=="true")
      throw new DigitalStoreError(503,"Le prix premium n’est pas validé.");
    return price;
  }

  async function fulfillSession(session){
    if(session?.metadata?.integration!==INTEGRATION||session.mode!=="payment"||session.status!=="complete"||session.payment_status!=="paid")return null;
    const uid=session.metadata?.user_id,code=session.metadata?.product_code;
    if(!UUID.test(uid||"")||!PRODUCT.test(code||""))throw new DigitalStoreError(503,"Achat numérique invalide.");
    const row=await product(code);
    const expectedLive=config.mode==="live";
    if(session.livemode!==expectedLive)throw new DigitalStoreError(503,"Mode de paiement incohérent.");

    const lines=await stripe().checkout.sessions.listLineItems(session.id,{limit:10,expand:["data.price.product"]});
    if(lines.has_more||lines.data.length!==1||lines.data[0].quantity!==1)throw new DigitalStoreError(503,"Contenu du paiement invalide.");
    const line=lines.data[0],price=line.price;
    if(!price||price.id!==row.stripe_price_id||line.currency!=="eur"||line.amount_total!==row.price_cents||session.amount_total!==row.price_cents)
      throw new DigitalStoreError(503,"Montant du paiement invalide.");

    const intentId=typeof session.payment_intent==="string"?session.payment_intent:session.payment_intent?.id;
    if(!PAYMENT_INTENT.test(intentId||""))throw new DigitalStoreError(503,"Paiement non vérifiable.");
    const intent=await stripe().paymentIntents.retrieve(intentId,{expand:["latest_charge"]});
    const charge=intent.latest_charge;
    if(intent.status!=="succeeded"||!charge||typeof charge!=="object"||charge.paid!==true||charge.livemode!==expectedLive
      ||charge.currency!=="eur"||charge.amount!==row.price_cents||!Number.isInteger(charge.amount_refunded)||charge.amount_refunded<0||charge.amount_refunded>charge.amount)
      throw new DigitalStoreError(503,"Paiement non confirmé.");

    // A dispute can arrive before Checkout fulfillment or a later status read.
    if(charge.disputed===true){
      await rpc('digital_store_revoke_purchase',{p_provider:'stripe',p_provider_transaction_id:intentId,p_reason:'dispute'});
      return {ok:false,status:'revoked'};
    }
    const receiptHash=createHash("sha256").update(session.id+":"+intentId+":"+row.code).digest("hex");
    const result=await rpc("digital_store_settle_v3",{
      p_user:uid,p_product_code:row.code,p_provider:"stripe",p_provider_transaction_id:intentId,
      p_provider_product_ref:row.stripe_price_id,p_amount_cents:row.price_cents,p_currency:"eur",
      p_receipt_hash:receiptHash,p_metadata:{stripe_session_id:session.id,livemode:session.livemode},
      p_refunded_cents:charge.amount_refunded,
    });
    if(result?.refundNeeded){
      await stripe().refunds.create({payment_intent:intentId,metadata:{integration:INTEGRATION,reason:'duplicate_permanent_item'}},{idempotencyKey:'3b-digital-duplicate:'+intentId});
      return {...result,ok:false,status:'refund_pending'};
    }
    return result;
  }

  async function recordEvent(event,processed,errorCode=null){
    try{
      await db("/rest/v1/digital_store_provider_events?on_conflict=provider,event_id",{
        method:"POST",prefer:"resolution=merge-duplicates,return=minimal",
        body:{provider:"stripe",event_id:event.id,event_type:event.type,processed,error_code:errorCode,processed_at:processed?new Date().toISOString():null},
      });
    }catch{}
  }

  function wrap(method,fn){
    return async request=>{
      if(request.method!==method)return json({error:"Méthode non autorisée."},405,{Allow:method});
      try{return await fn(request);}
      catch(error){
        return json({error:error instanceof DigitalStoreError?error.message:"Boutique numérique momentanément indisponible."},
          error instanceof DigitalStoreError?error.status:503);
      }
    };
  }

  return{
    catalog:wrap("GET",async request=>{
      const member=await currentMember(request);
      const scope=new URL(request.url).searchParams.get("scope")||"all";
      const [rows,owned]=await Promise.all([products(scope),entitlements(member.id)]);
      const ownedSet=new Set(owned.map(x=>x.product_code));
      const balances=config.expansionEnabled?await db('/rest/v1/digital_credit_accounts?user_id=eq.'+member.id+'&select=asset,balance'):[];
      const wallet=Object.fromEntries(['credits','premium_credits'].map(asset=>{const balance=Number(balances.find(b=>b.asset===asset)?.balance||0);return [asset,{available:Math.max(0,balance),debt:Math.max(0,-balance)}];}));
      const items=rows.map(row=>({
        code:row.code,scope:row.game_scope,name:row.name,description:row.description,
        amount:row.price_cents,currency:row.currency,category:row.metadata?.category||"premium",
        releaseState:row.release_state,noPayToWin:row.no_pay_to_win===true,owned:row.product_kind==='non_consumable'&&ownedSet.has(row.code),
        kind:row.product_kind,walletAsset:row.wallet_asset,walletAmount:row.wallet_amount,
        creditAsset:row.credit_asset,creditCost:row.credit_cost,
        creditReady:config.expansionEnabled&&config.creditSpendEnabled&&row.release_state==='live'&&!!row.credit_cost,
        provider:{
          web:allowedForUser(member.id,row)?"stripe":null,
          googlePlay:row.google_product_id||null,
          appStore:row.apple_product_id||null,
        },
      }));
      return json({items,wallet,expansionEnabled:config.expansionEnabled,mode:config.mode,purchasingEnabled:config.enabled,nativePurchasingEnabled:false});
    }),

    checkout:wrap("POST",async request=>{
      if(!config.enabled)throw new DigitalStoreError(503,"Les achats premium sont préparés mais pas encore ouverts.");
      if(request.headers.get("origin")!==config.origin)throw new DigitalStoreError(403,"Origine invalide.");
      if(!request.headers.get("content-type")?.startsWith("application/json"))throw new DigitalStoreError(415,"Format invalide.");
      const member=await currentMember(request);
      let body;try{body=JSON.parse(await readBody(request));}catch{throw new DigitalStoreError(400,"Demande invalide.");}
      if(!/^[0-9a-f-]{36}$/i.test(body?.attemptId||""))throw new DigitalStoreError(400,"Identifiant d’achat invalide.");
      const row=await product(body?.productCode);
      if(!allowedForUser(member.id,row))throw new DigitalStoreError(403,"Ce produit n’est pas encore ouvert à l’achat.");
      const owned=await entitlements(member.id);
      if(row.product_kind==='non_consumable'&&owned.some(x=>x.product_code===row.code))throw new DigitalStoreError(409,"Cet objet premium est déjà acquis.");
      await verifiedPrice(row);
      const digest=createHash("sha256").update(member.id+":"+row.code+":"+body.attemptId).digest("hex");
      const session=await stripe().checkout.sessions.create({
        mode:"payment",locale:"fr",line_items:[{price:row.stripe_price_id,quantity:1}],
        customer_creation:"always",
        metadata:{integration:INTEGRATION,user_id:member.id,product_code:row.code,game_scope:row.game_scope},
        payment_intent_data:{metadata:{integration:INTEGRATION,user_id:member.id,product_code:row.code,game_scope:row.game_scope}},
        success_url:config.origin+"/?digital_store=success&session_id={CHECKOUT_SESSION_ID}#"+(row.game_scope==="city"?"passport":"monde-3b"),
        cancel_url:config.origin+"/?digital_store=cancel#"+(row.game_scope==="city"?"passport":"monde-3b"),
      },{idempotencyKey:"3b-digital:"+digest});
      const url=new URL(session.url);
      if(url.origin!=="https://checkout.stripe.com")throw new DigitalStoreError(503,"Checkout invalide.");
      return json({url:session.url,sessionId:session.id,testMode:session.livemode===false});
    }),

    status:wrap("GET",async request=>{
      const member=await currentMember(request);
      const sessionId=new URL(request.url).searchParams.get("session_id")||"";
      if(!SESSION.test(sessionId))throw new DigitalStoreError(400,"Référence d’achat invalide.");
      const session=await stripe().checkout.sessions.retrieve(sessionId);
      if(session.metadata?.integration!==INTEGRATION||session.metadata?.user_id!==member.id)throw new DigitalStoreError(404,"Achat introuvable.");
      const entitlement=session.status==="complete"&&session.payment_status==="paid"?await fulfillSession(session):null;
      return json({paid:entitlement?.ok===true,status:session.status,paymentStatus:session.payment_status,entitlement});
    }),

    spend:wrap('POST',async request=>{
      if(!config.expansionEnabled||!config.creditSpendEnabled)throw new DigitalStoreError(503,'Les achats en crédits ne sont pas encore ouverts.');
      if(request.headers.get('origin')!==config.origin)throw new DigitalStoreError(403,'Origine invalide.');
      if(!request.headers.get('content-type')?.startsWith('application/json'))throw new DigitalStoreError(415,'Format invalide.');
      const member=await currentMember(request);
      let body;try{body=JSON.parse(await readBody(request));}catch{throw new DigitalStoreError(400,'Demande invalide.');}
      if(!UUID.test(body?.attemptId||''))throw new DigitalStoreError(400,'Identifiant d’achat invalide.');
      const row=await product(body?.productCode);
      if(row.release_state!=='live'||row.product_kind!=='non_consumable'||!row.credit_cost)throw new DigitalStoreError(404,'Objet indisponible en crédits.');
      return json(await rpc('digital_store_spend_credits',{p_user:member.id,p_product_code:row.code,p_request:body.attemptId}));
    }),

    webhook:wrap("POST",async request=>{
      if(!env.STRIPE_WEBHOOK_SECRET)throw new DigitalStoreError(503,"Webhook non configuré.");
      const raw=await readBody(request,262144);
      let event;
      try{event=stripe().webhooks.constructEvent(raw,request.headers.get("stripe-signature"),env.STRIPE_WEBHOOK_SECRET);}
      catch{throw new DigitalStoreError(400,"Signature invalide.");}
      try{
        if(["checkout.session.completed","checkout.session.async_payment_succeeded"].includes(event.type)){
          const incoming=event.data.object;
          if(incoming?.metadata?.integration===INTEGRATION){
            const session=await stripe().checkout.sessions.retrieve(incoming.id);
            await fulfillSession(session);
          }
        }else if(event.type==="charge.refunded"){
          const charge=event.data.object;
          const intentId=typeof charge.payment_intent==="string"?charge.payment_intent:charge.payment_intent?.id;
          if(PAYMENT_INTENT.test(intentId||"")&&charge.amount_refunded>0){
            const intent=await stripe().paymentIntents.retrieve(intentId);
            if(intent.metadata?.integration===INTEGRATION){const confirmed=await stripe().charges.retrieve(charge.id);await rpc("digital_store_refund_purchase",{p_provider:"stripe",p_provider_transaction_id:intentId,p_refunded_cents:confirmed.amount_refunded});}
          }
        }else if(event.type==="charge.dispute.created"){
          const chargeId=event.data.object?.charge;
          if(typeof chargeId==="string"){
            const charge=await stripe().charges.retrieve(chargeId);
            const intentId=typeof charge.payment_intent==="string"?charge.payment_intent:charge.payment_intent?.id;
            if(PAYMENT_INTENT.test(intentId||"")){
              const intent=await stripe().paymentIntents.retrieve(intentId);
              if(intent.metadata?.integration===INTEGRATION)await rpc("digital_store_revoke_purchase",{p_provider:"stripe",p_provider_transaction_id:intentId,p_reason:"dispute"});
            }
          }
        }
        await recordEvent(event,true);
      }catch(error){
        await recordEvent(event,false,"processing_failed");
        throw error;
      }
      return json({received:true});
    }),
  };
}
