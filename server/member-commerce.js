import {discountFor} from '../shared/loyalty.js';
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function createMemberCommerce({env,fetcher=fetch}){
 async function request(path,body){
  if(!env.SUPABASE_URL?.startsWith('https://')||!env.SUPABASE_SERVICE_ROLE_KEY)throw Error('Loyalty storage unavailable');
  const r=await fetcher(new URL(path,env.SUPABASE_URL),{method:body?'POST':'GET',headers:{apikey:env.SUPABASE_SERVICE_ROLE_KEY,Authorization:'Bearer '+env.SUPABASE_SERVICE_ROLE_KEY,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(10000)});
  if(!r.ok)throw Error('Loyalty storage unavailable');return r.json();
 }
 const rpc=(name,body)=>request('/rest/v1/rpc/'+name,body);
 return{
  async member(incoming){
   const auth=incoming.headers.get('authorization');if(!auth)return null;
   if(!auth.startsWith('Bearer ')||!env.SUPABASE_URL?.startsWith('https://')||!env.SUPABASE_SERVICE_ROLE_KEY)throw Error('Invalid member authentication');
   const r=await fetcher(new URL('/auth/v1/user',env.SUPABASE_URL),{method:'GET',headers:{apikey:env.SUPABASE_SERVICE_ROLE_KEY,Authorization:auth},signal:AbortSignal.timeout(10000)});
   const user=await r.json();if(!r.ok||!UUID.test(user.id))throw Error('Invalid member authentication');
   let sid;try{sid=JSON.parse(Buffer.from(auth.slice(7).split('.')[1],'base64url')).session_id;}catch{}
   if(!UUID.test(sid||'')||!await rpc('loyalty_session_valid',{p_user:user.id,p_session:sid}))throw Error('Session expired');
   const rows=await request('/rest/v1/member_profiles?user_id=eq.'+user.id+'&select=user_id,points');
   if(!rows?.[0])throw Error('Member not ready');return{id:user.id,discount:discountFor(rows[0].points)};
  },
  async purchase(session,lines,stripe){
   const uid=session.metadata?.loyalty_user_id;
   if(!UUID.test(uid||'')||session.livemode!==true||session.currency!=='eur'||session.mode!=='payment'||session.status!=='complete'||session.payment_status!=='paid')return false;
   const intent=typeof session.payment_intent==='string'?session.payment_intent:session.payment_intent?.id;
   if(!/^pi_[A-Za-z0-9]+$/.test(intent||''))throw Error('Missing payment intent');
   let cents=0;for(const item of lines){if(item.currency!=='eur'||!Number.isSafeInteger(item.amount_total)||item.amount_total<0)throw Error('Invalid merchandise amount');cents+=item.amount_total;}
   if(!Number.isSafeInteger(cents)||!Number.isSafeInteger(session.amount_total)||cents>session.amount_total)throw Error('Invalid merchandise total');
   const payment=await stripe.paymentIntents.retrieve(intent,{expand:['latest_charge']});
   const charge=payment.latest_charge;
   if(!charge||typeof charge!=='object'||payment.status!=='succeeded'||charge.livemode!==true||charge.currency!=='eur'||charge.paid!==true||charge.payment_intent!==intent||!Number.isSafeInteger(charge.amount)||charge.amount!==session.amount_total||charge.amount<=0||!Number.isSafeInteger(charge.amount_refunded)||charge.amount_refunded<0||charge.amount_refunded>charge.amount)throw Error('Payment state unavailable');
   const refunded=Math.min(cents,Math.ceil(charge.amount_refunded*cents/charge.amount));
   const result=await rpc('loyalty_record_purchase',{p_user:uid,p_session:session.id,p_intent:intent,p_cents:cents,p_refunded:refunded});
   if(charge.amount_refunded>0)await this.refund(charge);
   return result;
  },
  async refund(charge){
   if(charge.livemode!==true||charge.currency!=='eur')return false;
   const intent=typeof charge.payment_intent==='string'?charge.payment_intent:charge.payment_intent?.id;
   if(!/^pi_[A-Za-z0-9]+$/.test(intent||''))return false;
   if(!Number.isSafeInteger(charge.amount_refunded)||charge.amount_refunded<0||!Number.isSafeInteger(charge.amount)||charge.amount<=0||charge.amount_refunded>charge.amount)throw Error('Invalid refund');
   const rows=await request('/rest/v1/member_purchase_rewards?payment_intent=eq.'+intent+'&select=merchandise_cents');if(!rows?.[0])return false;
   // Allocate a payment-level refund proportionally between merchandise and delivery.
   const cents=Math.min(rows[0].merchandise_cents,Math.ceil(charge.amount_refunded*rows[0].merchandise_cents/charge.amount));
   return rpc('loyalty_refund_purchase',{p_intent:intent,p_refunded:cents});
  },
 };
}
export async function loyaltyCoupon(stripe,percent){
 if(![5,8,10].includes(percent))throw Error('Invalid loyalty discount');const id='3b-loyalty-'+percent+'-v1';
 try{const coupon=await stripe.coupons.retrieve(id);if(!coupon.valid||coupon.percent_off!==percent||coupon.duration!=='once')throw Error('Invalid loyalty coupon');return coupon.id;}
 catch(error){if(error.code!=='resource_missing')throw error;}
 const coupon=await stripe.coupons.create({id,percent_off:percent,duration:'once',name:'Avantage membre 3B −'+percent+' %',metadata:{program:'3b-loyalty-v1'}},{idempotencyKey:id});return coupon.id;
}
