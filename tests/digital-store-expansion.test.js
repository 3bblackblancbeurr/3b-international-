import test from 'node:test';import assert from 'node:assert/strict';
import {createDigitalStore,digitalStoreConfig} from '../server/digital-store.js';
const uid='00000000-0000-4000-8000-000000000001',sid='00000000-0000-4000-8000-000000000002';
const env={APP_URL:'https://3b.example',SUPABASE_URL:'https://db.example',SUPABASE_SERVICE_ROLE_KEY:'x'.repeat(40),STRIPE_SECRET_KEY:'sk_test_demo',STRIPE_WEBHOOK_SECRET:'whsec_test',DIGITAL_STORE_TEST_ENABLED:'true',DIGITAL_STORE_TEST_USER_IDS:uid,DIGITAL_STORE_EXPANSION_ENABLED:'true'};
const token='a.'+Buffer.from(JSON.stringify({session_id:sid})).toString('base64url')+'.b';
const row={code:'CITY_CREDITS_500',game_scope:'city',product_kind:'consumable',price_cents:499,currency:'eur',active:true,release_state:'test',no_pay_to_win:true,stripe_price_id:'price_test',wallet_asset:'credits',wallet_amount:500};
function setup({expansion=true,fulfilled=true}={}){
 const calls=[];
 const session={id:'cs_test_abc',livemode:false,status:'complete',payment_status:'paid',mode:'payment',amount_total:499,payment_intent:'pi_test',metadata:{integration:'3b-digital-store-v1',user_id:uid,product_code:row.code}};
 const fetcher=async(url,options)=>{
  const path=new URL(url).pathname;calls.push({path,body:options.body&&JSON.parse(options.body)});
  if(path==='/auth/v1/user')return Response.json({id:uid});
  if(path.endsWith('loyalty_session_valid'))return Response.json(true);
  if(path.endsWith('member_profiles'))return Response.json([{user_id:uid,points:0}]);
  if(path.endsWith('digital_store_products'))return Response.json([row]);
  if(path.endsWith('digital_store_entitlements'))return Response.json([]);
  if(path.endsWith('digital_credit_accounts'))return Response.json([{asset:'credits',balance:-10}]);
  if(path.endsWith('digital_store_fulfill_v2'))return Response.json({ok:fulfilled,status:fulfilled?'paid':'refunded'});
  throw Error('Unexpected '+path);
 };
 let checkouts=0;
 const stripe={prices:{retrieve:async()=>({active:true,type:'one_time',currency:'eur',unit_amount:499,livemode:false,product:{active:true,metadata:{store_code:row.code,no_pay_to_win:'true'}}})},checkout:{sessions:{create:async()=>{checkouts++;return {id:'cs_test_abc',url:'https://checkout.stripe.com/test',livemode:false};},retrieve:async()=>session,listLineItems:async()=>({data:[{quantity:1,price:{id:'price_test'},currency:'eur',amount_total:499}],has_more:false})}},paymentIntents:{retrieve:async()=>({status:'succeeded',latest_charge:{paid:true,livemode:false,currency:'eur',amount:499,amount_refunded:0}})}};
 const store=createDigitalStore({env:{...env,DIGITAL_STORE_EXPANSION_ENABLED:String(expansion)},fetcher,stripe});
 const request=(route,body)=>new Request('https://3b.example/api/catalog'+route,{method:body?'POST':'GET',headers:{Authorization:'Bearer '+token,Origin:env.APP_URL,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});
 return {store,request,calls,checkouts:()=>checkouts};
}
test('credit expansion is opt-in and repeatable Checkout uses authenticated, fixed-price products',async()=>{
 assert.equal(digitalStoreConfig(env).creditSpendEnabled,false);
 const off=setup({expansion:false});assert.equal((await (await off.store.catalog(off.request('?scope=city'))).json()).items.length,0);
 const f=setup();const catalog=await (await f.store.catalog(f.request('?scope=city'))).json();
 assert.equal(catalog.wallet.credits.available,0);assert.equal(catalog.wallet.credits.debt,10);assert.equal(catalog.nativePurchasingEnabled,false);
 for(let n=0;n<2;n++)assert.equal((await f.store.checkout(f.request('',{productCode:row.code,attemptId:crypto.randomUUID()}))).status,200);
 assert.equal(f.checkouts(),2);
 assert.equal((await f.store.spend(f.request('',{productCode:row.code,attemptId:crypto.randomUUID()}))).status,503);
});
test('paid status respects revoked grants and fulfillment sends only trusted payment data',async()=>{
 const f=setup({fulfilled:false});const result=await (await f.store.status(f.request('?session_id=cs_test_abc'))).json();assert.equal(result.paid,false);
 const call=f.calls.find(c=>c.path.endsWith('digital_store_fulfill_v2'));assert.equal(call.body.p_user,uid);assert.equal(call.body.p_amount_cents,499);assert.equal(call.body.p_provider_transaction_id,'pi_test');
 assert.match(call.body.p_receipt_hash,/^[a-f0-9]{64}$/);
});
