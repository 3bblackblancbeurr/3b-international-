import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
import Stripe from 'stripe';
import {createShop} from '../server/shop.js';

const migration=readFileSync(new URL('../supabase/migrations/20261004124500_shop_inventory_reservations.sql',import.meta.url),'utf8');
async function database(){
 const db=new PGlite();
 await db.exec('create role anon; create role authenticated; create role service_role;');
 await db.exec(migration);
 return db;
}
async function reserve(db,token,items,live=false){return (await db.query('select shop_reserve_inventory($1,$2,$3) as ok',[token,live,JSON.stringify(items)])).rows[0].ok;}
const lines=[{price:'price_Test',quantity:1}];

test('stock reservations are atomic, idempotent and isolated from live quantities',async()=>{
 const db=await database();
 try{
  await db.exec("insert into shop_inventory values('price_Test',false,1,now()),('price_Test',true,9,now());");
  const result=await Promise.all(['a','b'].map(c=>reserve(db,c.repeat(64),lines)));
  assert.equal(result.filter(Boolean).length,1);
  const winner=result[0]?'a':'b',token=winner.repeat(64);
  assert.equal(await reserve(db,token,lines),true);
  assert.equal(await reserve(db,token,[{price:'price_Test',quantity:2}]),false);
  assert.equal((await db.query('select available from shop_inventory where livemode=false')).rows[0].available,0);
  assert.equal((await db.query('select available from shop_inventory where livemode=true')).rows[0].available,9);
  assert.equal((await db.query('select shop_commit_inventory($1,false,$2) as ok',[token,'cs_test_one'])).rows[0].ok,true);
  assert.equal((await db.query('select shop_commit_inventory($1,false,$2) as ok',[token,'cs_test_one'])).rows[0].ok,true);
  assert.equal((await db.query('select shop_commit_inventory($1,false,$2) as ok',[token,'cs_test_other'])).rows[0].ok,false);
  assert.equal((await db.query('select shop_release_inventory($1,false) as ok',[token])).rows[0].ok,false,'paid stock is never automatically restored');
  await db.exec('set role authenticated;');
  await assert.rejects(db.query('select * from shop_inventory'),/permission denied/);
  await db.exec('reset role;');
 }finally{await db.close();}
});

test('a multi-line shortage changes no stock, invalid quantities fail, and release runs once',async()=>{
 const db=await database();
 try{
  await db.exec("insert into shop_inventory values('price_Test',false,2,now()),('price_Zero',false,0,now());");
  assert.equal(await reserve(db,'c'.repeat(64),[...lines,{price:'price_Zero',quantity:1}]),false);
  assert.equal((await db.query("select available from shop_inventory where price_id='price_Test'")).rows[0].available,2);
  for(const items of [[{price:'price_Test',quantity:0}],[{price:'price_Test',quantity:1.5}],[...lines,...lines],[]])
   assert.equal(await reserve(db,'d'.repeat(64),items),false);
  const token='e'.repeat(64);assert.equal(await reserve(db,token,lines),true);
  for(let i=0;i<2;i++)assert.equal((await db.query('select shop_release_inventory($1,false) as ok',[token])).rows[0].ok,true);
  assert.equal((await db.query("select available from shop_inventory where price_id='price_Test'")).rows[0].available,2);
  assert.equal(await reserve(db,token,lines),false,'expired attempts cannot consume a second unit');
 }finally{await db.close();}
});

test('test checkout, signed webhook and durable order consume stock once; verified expiration releases it',async()=>{
 const db=await database(),origin='https://shop.example.test';
 const env={SHOP_ENABLED:'true',SHOP_RELEASE_APPROVED:'true',SHOP_INVENTORY_ENFORCED:'true',APP_URL:origin,
  STRIPE_SECRET_KEY:'sk_test_fixture',STRIPE_WEBHOOK_SECRET:'whsec_fixture',STRIPE_PRICE_IDS:'price_Test',
  SHOP_SHIPPING_INCLUDED:'true',SUPABASE_URL:'https://db.example.test',SUPABASE_SERVICE_ROLE_KEY:'test_key',
  SHOP_CHECKOUT_COOKIE_SECRET:'fixture-cookie-secret-with-32-characters',
  ...Object.fromEntries(['TERMS','PRIVACY','SHIPPING','RETURNS','LEGAL'].map(k=>['SHOP_'+k+'_URL',origin+'/'+k.toLowerCase()]))};
 const signer=new Stripe(env.STRIPE_SECRET_KEY),orders=new Map(),sessions=new Map();let creates=0,networkLost=false;
 const product={id:'prod_Test',active:true,name:'Test garment',metadata:{size:'M',color:'Noir'}};
 const price={id:'price_Test',active:true,type:'one_time',currency:'eur',unit_amount:8000,tax_behavior:'inclusive',billing_scheme:'per_unit',livemode:false,product};
 const stripe={webhooks:signer.webhooks,prices:{retrieve:async()=>price},checkout:{sessions:{
  create:async(params,{idempotencyKey})=>{
   creates++;
   if(!sessions.has(idempotencyKey))sessions.set(idempotencyKey,{id:'cs_test_'+sessions.size,url:'https://checkout.stripe.com/c/pay/test',livemode:false,mode:'payment',status:'open',payment_status:'unpaid',metadata:params.metadata,payment_intent:'pi_test',currency:'eur',amount_total:8000});
   if(networkLost)throw Error('response lost after Stripe created the session');
   return sessions.get(idempotencyKey);
  },retrieve:async id=>[...sessions.values()].find(s=>s.id===id),
  listLineItems:async()=>({has_more:false,data:[{price,quantity:1,amount_total:8000,currency:'eur',description:'Test garment'}]}),
 }}};
 const fetcher=async(url,options)=>{
  const path=new URL(url).pathname,body=options.body&&JSON.parse(options.body);
  if(path.includes('/rpc/shop_')){
   const name=path.split('/').at(-1),args=name==='shop_reserve_inventory'?[body.p_token,body.p_livemode,JSON.stringify(body.p_items)]:name==='shop_commit_inventory'?[body.p_token,body.p_livemode,body.p_session_id]:[body.p_token,body.p_livemode];
   const sql='select '+name+'('+args.map((_,i)=>'$'+(i+1)).join(',')+') as ok';return Response.json((await db.query(sql,args)).rows[0].ok);
  }
  if(path==='/rest/v1/shop_orders'){
   if(options.method==='POST')orders.set(body.stripe_session_id,body);
   return options.method==='GET'?Response.json([]):new Response(null,{status:201});
  }
  throw Error('Unexpected external request '+path);
 };
 const shop=createShop({env,stripe,fetcher});
 const checkout=attempt=>shop.checkout(new Request(origin+'/api/checkout',{method:'POST',headers:{origin,'content-type':'application/json'},body:JSON.stringify({attemptId:attempt,items:[{priceId:'price_Test',quantity:1}]})}));
 const webhook=async(session,type)=>{
  const payload=JSON.stringify({id:'evt_test',type,livemode:false,data:{object:session}});
  return shop.webhook(new Request(origin+'/api/stripe-webhook',{method:'POST',headers:{'stripe-signature':signer.webhooks.generateTestHeaderString({payload,secret:env.STRIPE_WEBHOOK_SECRET})},body:payload}));
 };
 try{
  await db.exec("insert into shop_inventory values('price_Test',false,2,now());");
  const attempt='a640a1e9-3e68-4f8b-8b3a-9e7e8d8d4490';networkLost=true;
  assert.equal((await checkout(attempt)).status,503);networkLost=false;
  assert.equal((await checkout(attempt)).status,200);
  const session=[...sessions.values()][0];session.status='complete';session.payment_status='paid';
  assert.equal((await webhook(session,'checkout.session.completed')).status,200);
  assert.equal((await webhook(session,'checkout.session.completed')).status,200);
  assert.equal(orders.size,1);assert.equal((await db.query('select available from shop_inventory')).rows[0].available,1);
  assert.equal((await checkout('b640a1e9-3e68-4f8b-8b3a-9e7e8d8d4490')).status,200);
  const expired=[...sessions.values()][1];expired.status='expired';
  assert.equal((await webhook(expired,'checkout.session.expired')).status,200);
  assert.equal((await webhook(expired,'checkout.session.expired')).status,200);
  assert.equal((await db.query('select available from shop_inventory')).rows[0].available,1);
  const before=creates;await db.exec('update shop_inventory set available=0;');
  assert.equal((await checkout('c640a1e9-3e68-4f8b-8b3a-9e7e8d8d4490')).status,409);assert.equal(creates,before);
 }finally{await db.close();}
});
