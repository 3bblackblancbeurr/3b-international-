const BASE=Deno.env.get('SUPABASE_URL')!;
const ADMIN=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const PUBLIC=Deno.env.get('SUPABASE_ANON_KEY')!;
const ORIGINS=new Set(['https://3b-international.vercel.app','http://localhost:5173','http://127.0.0.1:5173','http://localhost:5174','http://127.0.0.1:5174']);
class Failure extends Error{constructor(public status:number,message:string){super(message);}}
async function api(path:string,body?:unknown,method=body===undefined?'GET':'POST'){
 const response=await fetch(BASE+path,{method,headers:{apikey:ADMIN,Authorization:'Bearer '+ADMIN,'Content-Type':'application/json',Prefer:'return=representation'},...(body===undefined?{}:{body:JSON.stringify(body)}),signal:AbortSignal.timeout(12000)});
 const data=await response.json().catch(()=>null);
 if(!response.ok){const message=typeof data?.message==='string'&&data.message.length<180?data.message:'Opération 3B indisponible.';throw new Failure(response.status>=500?503:400,message);}
 return data;
}
const rpc=(name:string,body:unknown)=>api('/rest/v1/rpc/'+name,body);
const enc=(value:string)=>encodeURIComponent(value);
const uuid=(value:unknown)=>typeof value==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
async function authenticate(req:Request){
 const header=req.headers.get('authorization')||'';if(!header.startsWith('Bearer '))throw new Failure(401,'Connecte-toi à ton compte 3B.');
 const response=await fetch(BASE+'/auth/v1/user',{headers:{apikey:PUBLIC,Authorization:header},signal:AbortSignal.timeout(10000)});
 const user=await response.json();if(!response.ok||!user.id)throw new Failure(401,'Ta session a expiré. Reconnecte-toi.');
 let sid;try{sid=JSON.parse(atob(header.slice(7).split('.')[1].replace(/-/g,'+').replace(/_/g,'/'))).session_id;}catch{}
 if(!sid||!await rpc('loyalty_session_valid',{p_user:user.id,p_session:sid}))throw new Failure(401,'Ta session a expiré. Reconnecte-toi.');
 return user.id as string;
}
function joinBy<T extends Record<string,any>>(items:T[],defs:Map<string,any>){return items.map(item=>({...item,definition:defs.get(item.item_code)||null}));}
async function definitions(){
 const rows=await api('/rest/v1/inventory_items?active=eq.true&select=code,name,description,item_type,rarity,tradeable,marketable,permanent,max_supply,minted_count,metadata&order=name.asc');
 return {rows,map:new Map((rows||[]).map((row:any)=>[row.code,row]))};
}
async function plans(uid:string){
 const [catalog,entitlements]=await Promise.all([
  api('/rest/v1/subscription_plans?active=eq.true&select=code,name,monthly_price_cents,currency,description,benefits,sort_order&order=sort_order.asc'),
  api('/rest/v1/member_entitlements?user_id=eq.'+uid+'&select=plan_code,status,current_period_end,cancel_at_period_end&limit=1')]);
 const entitlement=entitlements?.[0];
 return {catalog:catalog||[],current:entitlement&&['active','trialing'].includes(entitlement.status)?entitlement:null};
}
async function marketListings(uid:string,defs:Map<string,any>){
 const listings=await api('/rest/v1/marketplace_listings?status=eq.active&seller_id=not.is.null&select=id,item_instance_id,seller_id,price_coins,created_at&order=created_at.desc&limit=100');
 if(!listings?.length)return [];
 const ids=listings.map((x:any)=>x.item_instance_id);
 const sellers=[...new Set(listings.map((x:any)=>x.seller_id).filter(Boolean))];
 const [instances,profiles]=await Promise.all([
  api('/rest/v1/item_instances?id=in.('+ids.join(',')+')&select=id,item_code,serial_no,state,metadata'),
  sellers.length?api('/rest/v1/member_profiles?user_id=in.('+sellers.join(',')+')&select=user_id,handle,name'):[]]);
 const im=new Map((instances||[]).map((x:any)=>[x.id,x])),pm=new Map((profiles||[]).map((x:any)=>[x.user_id,x]));
 return listings.map((l:any)=>{const item=im.get(l.item_instance_id);return{id:l.id,priceCoins:l.price_coins,createdAt:l.created_at,isMine:l.seller_id===uid,seller:pm.get(l.seller_id)?.handle||'membre-3b',item:item?{...item,definition:defs.get(item.item_code)||null}:null};}).filter((x:any)=>x.item);
}
async function tradeRows(uid:string,defs:Map<string,any>){
 const trades=await api('/rest/v1/trade_offers?or=(proposer_id.eq.'+uid+',recipient_id.eq.'+uid+')&select=id,proposer_id,recipient_id,status,created_at,expires_at,resolved_at&order=created_at.desc&limit=50');
 if(!trades?.length)return [];
 const tradeIds=trades.map((x:any)=>x.id);
 const items=await api('/rest/v1/trade_offer_items?trade_id=in.('+tradeIds.join(',')+')&select=trade_id,item_instance_id,side');
 const itemIds=[...new Set((items||[]).map((x:any)=>x.item_instance_id))];
 const instances=itemIds.length?await api('/rest/v1/item_instances?id=in.('+itemIds.join(',')+')&select=id,item_code,serial_no,owner_id,state,metadata'):[];
 const users=[...new Set(trades.flatMap((x:any)=>[x.proposer_id,x.recipient_id]).filter(Boolean))];
 const profiles=users.length?await api('/rest/v1/member_profiles?user_id=in.('+users.join(',')+')&select=user_id,handle,name'):[];
 const im=new Map((instances||[]).map((x:any)=>[x.id,x])),pm=new Map((profiles||[]).map((x:any)=>[x.user_id,x]));
 return trades.map((t:any)=>({id:t.id,status:t.status,createdAt:t.created_at,expiresAt:t.expires_at,resolvedAt:t.resolved_at,direction:t.proposer_id===uid?'sent':'received',proposer:pm.get(t.proposer_id)?.handle||'membre-3b',recipient:pm.get(t.recipient_id)?.handle||'membre-3b',items:(items||[]).filter((x:any)=>x.trade_id===t.id).map((x:any)=>{const item=im.get(x.item_instance_id);return{side:x.side,item:item?{id:item.id,item_code:item.item_code,serial_no:item.serial_no,state:item.state,metadata:item.metadata,definition:defs.get(item.item_code)||null}:null};}).filter((x:any)=>x.item)}));
}
async function snapshot(uid:string){
 const [{rows:defsRows,map:defs},profiles,owned,rewardRules,claims,subscription]=await Promise.all([
  definitions(),
  api('/rest/v1/member_profiles?user_id=eq.'+uid+'&select=user_id,handle,name,country,xp,points&limit=1'),
  api('/rest/v1/item_instances?owner_id=eq.'+uid+'&select=id,item_code,serial_no,state,equipped_slot,origin,origin_ref,metadata,minted_at,acquired_at&order=acquired_at.desc&limit=250'),
  api('/rest/v1/collectible_reward_rules?active=eq.true&select=code,item_code,label,xp_required,sort_order&order=sort_order.asc'),
  api('/rest/v1/collectible_reward_claims?user_id=eq.'+uid+'&select=rule_code,item_instance_id,claimed_at'),
  plans(uid)]);
 if(!profiles?.[0])throw new Failure(404,'Ton compte 3B doit être activé avant d’utiliser la collection.');
 const [listings,trades]=await Promise.all([marketListings(uid,defs),tradeRows(uid,defs)]);
 const claimed=new Set((claims||[]).map((x:any)=>x.rule_code));
 return{profile:profiles[0],subscription,definitions:defsRows,items:joinBy(owned||[],defs),listings,trades,rewards:(rewardRules||[]).map((r:any)=>({...r,claimed:claimed.has(r.code),definition:defs.get(r.item_code)||null}))};
}
async function publicMemberItems(uid:string,handle:string){
 const clean=String(handle||'').trim().toLowerCase();if(!/^[a-z0-9][a-z0-9._-]{2,23}$/.test(clean))throw new Failure(400,'Identifiant 3B invalide.');
 const profiles=await api('/rest/v1/member_profiles?handle=eq.'+enc(clean)+'&select=user_id,handle,name&limit=1');const member=profiles?.[0];
 if(!member||member.user_id===uid)throw new Failure(404,'Membre introuvable.');
 const {map:defs}=await definitions();
 const items=await api('/rest/v1/item_instances?owner_id=eq.'+member.user_id+'&state=eq.owned&select=id,item_code,serial_no,metadata,acquired_at&order=acquired_at.desc&limit=100');
 return{member:{handle:member.handle,name:member.name},items:(items||[]).map((item:any)=>({...item,definition:defs.get(item.item_code)||null})).filter((x:any)=>x.definition?.tradeable)};
}
Deno.serve(async req=>{
 const origin=req.headers.get('origin')||'';const cors={...(ORIGINS.has(origin)?{'Access-Control-Allow-Origin':origin}:{}),'Access-Control-Allow-Headers':'authorization,apikey,content-type,x-client-info','Access-Control-Allow-Methods':'POST,OPTIONS','Vary':'Origin','Cache-Control':'no-store'};
 const reply=(body:unknown,status=200)=>Response.json(body,{status,headers:cors});
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers:cors});
 if(req.method!=='POST')return reply({error:'Méthode non autorisée.'},405);
 if(origin&&!ORIGINS.has(origin))return reply({error:'Origine non autorisée.'},403);
 try{
  if(!req.headers.get('content-type')?.startsWith('application/json'))throw new Failure(415,'Format invalide.');
  const text=await req.text();if(new TextEncoder().encode(text).byteLength>16384)throw new Failure(413,'Demande trop volumineuse.');
  let body:any;try{body=JSON.parse(text);}catch{throw new Failure(400,'Demande invalide.');}
  const uid=await authenticate(req);if(!await rpc('loyalty_rate',{p_key:uid+':marketplace-3b',p_limit:120,p_window:60}))throw new Failure(429,'Patiente un instant puis réessaie.');
  const action=body?.action;
  if(action==='snapshot')return reply(await snapshot(uid));
  if(action==='member_items')return reply(await publicMemberItems(uid,body.handle));
  if(action==='claim'){
   if(typeof body.rule!=='string'||body.rule.length>80)throw new Failure(400,'Récompense invalide.');
   await rpc('market_claim_reward',{p_user:uid,p_rule:body.rule});return reply(await snapshot(uid));
  }
  if(action==='list'){
   if(!uuid(body.item)||!Number.isInteger(body.price)||body.price<1||body.price>10000000)throw new Failure(400,'Annonce invalide.');
   await rpc('market_list_item',{p_user:uid,p_item:body.item,p_price:body.price});return reply(await snapshot(uid));
  }
  if(action==='cancel_listing'){
   if(!uuid(body.listing))throw new Failure(400,'Annonce invalide.');await rpc('market_cancel_listing',{p_user:uid,p_listing:body.listing});return reply(await snapshot(uid));
  }
  if(action==='buy'){
   if(!uuid(body.listing))throw new Failure(400,'Annonce invalide.');await rpc('market_buy_listing',{p_buyer:uid,p_listing:body.listing});return reply(await snapshot(uid));
  }
  if(action==='equip'){
   if(!uuid(body.item)||!(body.slot===null||typeof body.slot==='string'))throw new Failure(400,'Équipement invalide.');await rpc('market_equip_item',{p_user:uid,p_item:body.item,p_slot:body.slot});return reply(await snapshot(uid));
  }
  if(action==='trade_create'){
   const handle=String(body.handle||'').trim().toLowerCase();const profiles=await api('/rest/v1/member_profiles?handle=eq.'+enc(handle)+'&select=user_id&limit=1');const recipient=profiles?.[0]?.user_id;
   const offer=Array.isArray(body.offer)?body.offer:[],request=Array.isArray(body.request)?body.request:[];
   if(!recipient||offer.some((x:any)=>!uuid(x))||request.some((x:any)=>!uuid(x)))throw new Failure(400,'Échange invalide.');
   await rpc('market_create_trade',{p_user:uid,p_recipient:recipient,p_offer:offer,p_request:request});return reply(await snapshot(uid));
  }
  if(action==='trade_accept'||action==='trade_decline'){
   if(!uuid(body.trade))throw new Failure(400,'Échange invalide.');await rpc('market_respond_trade',{p_user:uid,p_trade:body.trade,p_accept:action==='trade_accept'});return reply(await snapshot(uid));
  }
  if(action==='trade_cancel'){
   if(!uuid(body.trade))throw new Failure(400,'Échange invalide.');await rpc('market_cancel_trade',{p_user:uid,p_trade:body.trade});return reply(await snapshot(uid));
  }
  throw new Failure(400,'Action inconnue.');
 }catch(error){return reply({error:error instanceof Failure?error.message:'Le marché 3B est momentanément indisponible.'},error instanceof Failure?error.status:503);}
});
