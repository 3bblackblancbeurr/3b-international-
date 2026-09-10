import test from 'node:test';
import assert from 'node:assert/strict';
import {tierFor,themeFor,nextTier,discountFor,purchaseRewards,validateAccount} from '../shared/loyalty.js';
import {createMemberCommerce,loyaltyCoupon} from '../server/member-commerce.js';

const uid='7ed3fd82-e955-4e92-b944-98ea07be9f13',sid='76698715-bb21-4cf2-8fc3-15a0e6e99113';
const env={SUPABASE_URL:'https://db.example.test',SUPABASE_SERVICE_ROLE_KEY:'fixture'};
const token='header.'+Buffer.from(JSON.stringify({session_id:sid})).toString('base64url')+'.signature';
const incoming=()=>new Request('https://example.test',{headers:{Authorization:'Bearer '+token}});
function fixture(){
 const calls=[],state={valid:true,points:3000,merchandise:9000};
 const fetcher=async(url,options)=>{const path=new URL(url).pathname,body=options.body?JSON.parse(options.body):null;calls.push({url:String(url),path,body});
  if(path==='/auth/v1/user')return Response.json({id:uid});
  if(path.endsWith('/loyalty_session_valid'))return Response.json(state.valid);
  if(path.endsWith('/member_profiles'))return Response.json([{user_id:uid,points:state.points}]);
  if(path.endsWith('/member_purchase_rewards'))return Response.json([{merchandise_cents:state.merchandise}]);
  return Response.json(true);
 };
 const charge={id:'ch_fixture',livemode:true,paid:true,currency:'eur',amount:9500,amount_refunded:0,payment_intent:'pi_fixture'};
 const stripe={paymentIntents:{retrieve:async()=>({status:'succeeded',latest_charge:charge})}};
 const session={id:'cs_live_fixture',livemode:true,currency:'eur',mode:'payment',status:'complete',payment_status:'paid',payment_intent:'pi_fixture',amount_total:9500,metadata:{loyalty_user_id:uid}};
 const lines=[{currency:'eur',amount_total:9000}];
 return {helper:createMemberCommerce({env,fetcher}),calls,state,charge,stripe,session,lines};
}
test('card and discount boundaries are independent and capped',()=>{
 assert.equal(tierFor(299).id,'discovery');assert.equal(tierFor(300).id,'explorer');assert.equal(tierFor(12000).id,'legend');
 assert.equal(themeFor('legend',300).id,'explorer');assert.equal(themeFor('discovery',12000).id,'discovery');assert.equal(nextTier(12000).id,'builder');assert.equal(nextTier(100000),null);
 assert.deepEqual([999,1000,2999,3000,6999,7000,999999].map(discountFor),[0,5,5,8,8,10,10]);
 assert.deepEqual(purchaseRewards(1099),{xp:109,points:109});assert.throws(()=>purchaseRewards(1.5));assert.throws(()=>purchaseRewards(-1));
});
test('accounts reject ambiguous handles, weak passwords and unknown countries',()=>{
 const good={handle:' KaIs_3B ',password:'a-long-fixture-password',name:'Kaïs',country:'France'};
 assert.equal(validateAccount(good).handle,'kais_3b');
 for(const patch of [{handle:'a@b.fr'},{handle:'a'},{password:'123'},{country:'Unknown'},{name:'a'},{password:'x'.repeat(129)}])assert.throws(()=>validateAccount({...good,...patch}));
});
test('new illustrated cards unlock exactly at their XP threshold without changing discounts or equipped older cards',()=>{
 for(const [xp,id,previous] of [[30000,'builder','legend'],[60000,'visionary','builder'],[100000,'eternal','visionary']]){
  assert.equal(tierFor(xp-1).id,previous);assert.equal(tierFor(xp).id,id);
  assert.equal(themeFor(id,xp-1).id,previous);assert.equal(themeFor(id,xp).id,id);
  assert.equal(themeFor('legend',xp).id,'legend');assert.equal(discountFor(999999),10);
 }
});
test('discount identity and balance come from a verified active account',async()=>{
 const f=fixture();assert.deepEqual(await f.helper.member(incoming()),{id:uid,discount:8});
 assert.deepEqual(f.calls.find(c=>c.path.endsWith('loyalty_session_valid')).body,{p_user:uid,p_session:sid});
 f.state.valid=false;await assert.rejects(()=>f.helper.member(incoming()),/expired/);
 assert.equal(await f.helper.member(new Request('https://example.test')),null);
});
test('an invalid auth response cannot become a member',async()=>{
 const helper=createMemberCommerce({env,fetcher:async()=>Response.json({id:uid},{status:401})});
 await assert.rejects(()=>helper.member(incoming()));
});
test('test, unpaid, unfinished, foreign-currency and anonymous orders earn nothing',async()=>{
 for(const patch of [{livemode:false},{payment_status:'unpaid'},{status:'open'},{currency:'usd'},{metadata:{}},{mode:'subscription'}]){
  const f=fixture();assert.equal(await f.helper.purchase({...f.session,...patch},f.lines,f.stripe),false);assert.equal(f.calls.length,0);
 }
});
test('paid merchandise uses Stripe line totals after discount, excluding shipping',async()=>{
 const f=fixture();await f.helper.purchase(f.session,f.lines,f.stripe);
 assert.deepEqual(f.calls[0].body,{p_user:uid,p_session:'cs_live_fixture',p_intent:'pi_fixture',p_cents:9000,p_refunded:0});
});
test('out-of-order refund is deducted from initial credit before fulfillment',async()=>{
 const f=fixture();f.charge.amount_refunded=4750;await f.helper.purchase(f.session,f.lines,f.stripe);
 assert.equal(f.calls[0].body.p_refunded,4500);
 assert.deepEqual(f.calls.at(-1).body,{p_intent:'pi_fixture',p_refunded:4500});
});
test('full refund removes all merchandise rewards and ignores test charges',async()=>{
 const f=fixture();f.charge.amount_refunded=9500;await f.helper.refund(f.charge);
 assert.deepEqual(f.calls.at(-1).body,{p_intent:'pi_fixture',p_refunded:9000});
 assert.equal(await f.helper.refund({...f.charge,livemode:false}),false);
});
test('inconsistent payment state and unbounded amounts fail without awarding',async()=>{
 for(const change of [f=>f.lines[0].amount_total=10000,f=>f.lines[0].amount_total=-1,f=>f.charge.amount_refunded=10000,f=>f.charge.paid=false,f=>f.charge.payment_intent='pi_different',f=>f.session.amount_total=NaN]){
  const f=fixture();change(f);await assert.rejects(()=>f.helper.purchase(f.session,f.lines,f.stripe));assert.equal(f.calls.length,0);
 }
});
test('discount coupons use fixed rates and idempotent creation',async()=>{
 const creates=[];const stripe={coupons:{retrieve:async()=>{throw Object.assign(Error('missing'),{code:'resource_missing'});},create:async(params,opts)=>{creates.push({params,opts});return{id:params.id};}}};
 assert.equal(await loyaltyCoupon(stripe,8),'3b-loyalty-8-v1');assert.equal(creates[0].params.percent_off,8);assert.equal(creates[0].opts.idempotencyKey,'3b-loyalty-8-v1');
 await assert.rejects(()=>loyaltyCoupon(stripe,100));
 stripe.coupons.retrieve=async()=>({id:'3b-loyalty-8-v1',valid:true,percent_off:100,duration:'once'});
 await assert.rejects(()=>loyaltyCoupon(stripe,8));
});

