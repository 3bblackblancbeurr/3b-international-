import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import Stripe from "stripe";
import {
  allocateGross,
  createNosblocCommerce,
  nosblocCommerceConfig,
} from "../server/nosbloc-commerce.js";

const ORIGIN="https://nosbloc.example.test";
const BUYER="11111111-1111-4111-8111-111111111111";
const CREATOR_A="22222222-2222-4222-8222-222222222222";
const CREATOR_B="33333333-3333-4333-8333-333333333333";
const PRODUCT="44444444-4444-4444-8444-444444444444";
const PROJECT="55555555-5555-4555-8555-555555555555";
const ATTEMPT="66666666-6666-4666-8666-666666666666";

const baseEnv={
  APP_URL:ORIGIN,
  STRIPE_SECRET_KEY:"sk_test_fixture",
  NOSBLOC_STRIPE_WEBHOOK_SECRET:"whsec_nosbloc_fixture",
  SUPABASE_URL:"https://db.example.test",
  SUPABASE_SERVICE_ROLE_KEY:"server_fixture",
  NOSBLOC_COMMERCE_ENABLED:"true",
  NOSBLOC_CONNECT_ENABLED:"true",
  NOSBLOC_PAYOUTS_ENABLED:"false",
  NOSBLOC_STRIPE_MODE:"test",
  NOSBLOC_PLATFORM_FEE_BPS:"1000",
  NOSBLOC_AUTOMATIC_TAX:"false",
};

function fixture(overrides={}){
  const calls={
    accountCreates:[],accountLinks:[],checkouts:[],transfers:[],rpc:[],orders:[],allocations:[],patches:[],
  };
  const connected=new Map([
    [CREATOR_A,{user_id:CREATOR_A,stripe_account_id:"acct_creatorA",environment:"test",onboarding_status:"verified",transfers_enabled:true,payouts_enabled:true,requirements_due:0,country:"FR"}],
    [CREATOR_B,{user_id:CREATOR_B,stripe_account_id:"acct_creatorB",environment:"test",onboarding_status:"verified",transfers_enabled:true,payouts_enabled:true,requirements_due:0,country:"FR"}],
  ]);
  const signer=new Stripe("sk_test_fixture");
  let lastSession=null;
  const stripe={
    v2:{core:{
      accounts:{
        create:async(params,options)=>{
          calls.accountCreates.push({params,options});
          return{
            id:"acct_newcreator",
            identity:{country:params.identity.country},
            configuration:{recipient:{capabilities:{stripe_balance:{stripe_transfers:{status:"pending"},payouts:{status:"pending"}}}}},
            requirements:{currently_due:["identity.document"]},
          };
        },
        retrieve:async id=>{
          const row=[...connected.values()].find(value=>value.stripe_account_id===id);
          return{
            id,
            identity:{country:row?.country||"FR"},
            configuration:{recipient:{capabilities:{stripe_balance:{stripe_transfers:{status:row?.transfers_enabled?"active":"pending"},payouts:{status:row?.payouts_enabled?"active":"pending"}}}}},
            requirements:{currently_due:row?.requirements_due?["identity.document"]:[]},
          };
        },
      },
      accountLinks:{
        create:async params=>{
          calls.accountLinks.push(params);
          return{url:"https://connect.stripe.com/setup/s/test"};
        },
      },
    }},
    checkout:{sessions:{
      create:async(params,options)=>{
        calls.checkouts.push({params,options});
        lastSession={
          id:"cs_test_nosbloc_fixture",
          url:"https://checkout.stripe.com/c/pay/cs_test_nosbloc_fixture",
          mode:"payment",status:"complete",payment_status:"paid",livemode:false,currency:"eur",
          amount_total:1299,payment_intent:"pi_nosbloc_fixture",metadata:params.metadata,
        };
        return lastSession;
      },
      retrieve:async()=>lastSession,
    }},
    charges:{
      retrieve:async()=>({id:"ch_nosbloc_fixture",payment_intent:"pi_nosbloc_fixture",amount:1299,amount_refunded:500,livemode:false,currency:"eur"}),
    },
    transfers:{
      create:async(params,options)=>{calls.transfers.push({params,options});return{id:"tr_nosbloc_fixture"};},
    },
    webhooks:signer.webhooks,
  };

  const product={
    product_id:PRODUCT,project_id:PROJECT,owner_id:CREATOR_A,title:"Pack Justice",
    description:"Contenu numérique Nosbloc créé pour tester un achat serveur fiable.",
    price_cents:1299,currency:"eur",status:"active",version:7,
  };
  const recipients=[
    {creator_id:CREATOR_A,share_bps:6000},
    {creator_id:CREATOR_B,share_bps:4000},
  ];
  const orders=new Map();

  const fetcher=async(url,options={})=>{
    const target=new URL(url);
    const path=target.pathname;
    const method=options.method||"GET";
    const body=options.body?JSON.parse(options.body):null;

    if(path==="/rest/v1/nosbloc_commerce_config"){
      return Response.json([{
        commerce_enabled:true,connect_enabled:true,payouts_enabled:false,currency:"eur",platform_fee_bps:1000,
      }]);
    }
    if(path==="/rest/v1/nosbloc_products")return Response.json([product]);
    if(path==="/rest/v1/nosbloc_product_recipients")return Response.json(recipients);
    if(path==="/rest/v1/nosbloc_creator_balances"){
      return Response.json([{currency:"eur",pending_cents:1200,available_cents:3400,paid_out_cents:5600}]);
    }
    if(path==="/rest/v1/nosbloc_connected_accounts"){
      if(method==="POST"){
        connected.set(body.user_id,{...connected.get(body.user_id),...body});
        return Response.json([connected.get(body.user_id)],{status:201});
      }
      const exact=target.searchParams.get("user_id");
      if(exact?.startsWith("eq.")){
        const id=exact.slice(3);
        return Response.json(connected.has(id)?[connected.get(id)]:[]);
      }
      if(exact?.startsWith("in.(")){
        const ids=exact.slice(4,-1).split(",");
        return Response.json(ids.map(id=>connected.get(id)).filter(Boolean));
      }
      return Response.json([]);
    }
    if(path==="/rest/v1/nosbloc_orders"){
      if(method==="POST"){
        orders.set(body.order_id,{...body});
        calls.orders.push(body);
        return new Response(null,{status:201});
      }
      if(method==="PATCH"){
        const key=target.searchParams.get("order_id")?.slice(3);
        if(key&&orders.has(key))orders.set(key,{...orders.get(key),...body});
        calls.patches.push(body);
        return new Response(null,{status:204});
      }
      const sessionFilter=target.searchParams.get("stripe_session_id");
      if(sessionFilter?.startsWith("eq.")){
        const session=sessionFilter.slice(3);
        return Response.json([...orders.values()].filter(row=>row.stripe_session_id===session));
      }
      const orderFilter=target.searchParams.get("order_id");
      if(orderFilter?.startsWith("eq.")){
        const row=orders.get(orderFilter.slice(3));
        return Response.json(row?[row]:[]);
      }
      return Response.json([]);
    }
    if(path==="/rest/v1/nosbloc_order_allocations"){
      if(method==="POST"){
        calls.allocations.push(...body);
        return new Response(null,{status:201});
      }
      return Response.json([]);
    }
    if(path.startsWith("/rest/v1/rpc/")){
      const name=path.split("/").at(-1);
      calls.rpc.push({name,body});
      return Response.json({ok:true,duplicate:false});
    }
    return Response.json([]);
  };

  const members={member:async()=>({id:BUYER,discount:0})};
  const env={...baseEnv,...overrides.env};
  const commerce=createNosblocCommerce({env,stripe,fetcher,members});
  return{commerce,stripe,signer,calls,connected,orders,env,getSession:()=>lastSession};
}

function post(path,body,headers={}){
  return new Request(`${ORIGIN}${path}`,{
    method:"POST",
    headers:{origin:ORIGIN,"content-type":"application/json",authorization:"Bearer fixture",...headers},
    body:JSON.stringify(body),
  });
}

test("creator commerce remains closed unless all explicit server gates are configured",()=>{
  const closed=nosblocCommerceConfig({});
  assert.equal(closed.commerceEnabled,false);
  assert.equal(closed.connectEnabled,false);
  assert.equal(closed.payoutsEnabled,false);

  const open=nosblocCommerceConfig(baseEnv);
  assert.equal(open.commerceEnabled,true);
  assert.equal(open.connectEnabled,true);
  assert.equal(open.payoutsEnabled,false);
  assert.equal(open.livemode,false);

  const wrongMode=nosblocCommerceConfig({...baseEnv,NOSBLOC_STRIPE_MODE:"live"});
  assert.equal(wrongMode.baseReady,false);
  assert.equal(wrongMode.commerceEnabled,false);
});

test("gross creator allocation reconciles every cent and applies the server fee",()=>{
  const rows=allocateGross(10001,[
    {creator_id:CREATOR_A,share_bps:6000},
    {creator_id:CREATOR_B,share_bps:4000},
  ],1000);
  assert.equal(rows.reduce((sum,row)=>sum+row.gross_share_cents,0),10001);
  assert.equal(rows.reduce((sum,row)=>sum+row.platform_fee_cents+row.creator_net_cents,0),10001);
  assert.equal(rows[0].gross_share_cents,6000);
  assert.equal(rows[1].gross_share_cents,4001);
});

test("Connect onboarding uses Accounts v2 recipient configuration and never legacy Express type",async()=>{
  const f=fixture();
  const response=await f.commerce.connect(post("/api/nosbloc-connect",{country:"FR"}));
  assert.equal(response.status,200);
  const data=await response.json();
  assert.equal(data.testMode,true);
  assert.match(data.url,/^https:\/\/connect\.stripe\.com\//);
  assert.equal(f.calls.accountCreates.length,1);
  const {params,options}=f.calls.accountCreates[0];
  assert.equal(params.dashboard,"express");
  assert.equal(params.identity.country,"FR");
  assert.equal(params.configuration.recipient.capabilities.stripe_balance.stripe_transfers.requested,true);
  assert.equal(params.type,undefined);
  assert.equal(params.configuration.merchant,undefined);
  assert.equal(params.defaults.responsibilities.losses_collector,"application");
  assert.match(options.idempotencyKey,/^nosbloc-connect:test:/);
  assert.deepEqual(f.calls.accountLinks[0].use_case.account_onboarding.configurations,["recipient"]);
});

test("checkout trusts database product price and team splits, not client supplied money",async()=>{
  const f=fixture();
  const response=await f.commerce.checkout(post("/api/nosbloc-checkout",{
    productId:PRODUCT,attemptId:ATTEMPT,price_cents:1,currency:"usd",creator_net_cents:999999,
  }));
  assert.equal(response.status,200);
  const data=await response.json();
  assert.equal(data.testMode,true);
  assert.equal(f.calls.checkouts.length,1);
  const {params,options}=f.calls.checkouts[0];
  assert.equal(params.line_items[0].price_data.unit_amount,1299);
  assert.equal(params.line_items[0].price_data.currency,"eur");
  assert.equal(params.metadata.product_id,PRODUCT);
  assert.match(params.payment_intent_data.transfer_group,/^NB3B_/);
  assert.match(options.idempotencyKey,/^nosbloc:test:/);
  assert.equal(f.calls.allocations.reduce((sum,row)=>sum+row.gross_share_cents,0),1299);
  assert.equal(f.calls.allocations.reduce((sum,row)=>sum+row.share_bps,0),10000);
});

test("unknown origins and malformed attempts are rejected before Stripe",async()=>{
  const f=fixture();
  const badOrigin=post("/api/nosbloc-checkout",{productId:PRODUCT,attemptId:ATTEMPT},{origin:"https://evil.example"});
  assert.equal((await f.commerce.checkout(badOrigin)).status,403);
  assert.equal((await f.commerce.checkout(post("/api/nosbloc-checkout",{productId:PRODUCT,attemptId:"forged"}))).status,400);
  assert.equal(f.calls.checkouts.length,0);
});

test("payout processor is physically blocked while payout kill-switch is closed",async()=>{
  const f=fixture();
  await assert.rejects(()=>f.commerce.processTransfers(),/verrouillés/);
  assert.equal(f.calls.transfers.length,0);
});

test("signed paid webhook calls the atomic ledger RPC and tampering is rejected",async()=>{
  const f=fixture();
  const checkout=await f.commerce.checkout(post("/api/nosbloc-checkout",{productId:PRODUCT,attemptId:ATTEMPT}));
  assert.equal(checkout.status,200);
  const session=f.getSession();
  const payload=JSON.stringify({
    id:"evt_nosbloc_paid_fixture",type:"checkout.session.completed",livemode:false,data:{object:session},
  });
  const signature=f.signer.webhooks.generateTestHeaderString({payload,secret:baseEnv.NOSBLOC_STRIPE_WEBHOOK_SECRET});
  const valid=new Request(`${ORIGIN}/api/nosbloc-stripe-webhook`,{
    method:"POST",headers:{"stripe-signature":signature},body:payload,
  });
  assert.equal((await f.commerce.webhook(valid)).status,200);
  assert.equal(f.calls.rpc.at(-1).name,"nosbloc_record_paid_order_server");
  assert.equal(f.calls.rpc.at(-1).body.p_gross_cents,1299);

  const tampered=new Request(`${ORIGIN}/api/nosbloc-stripe-webhook`,{
    method:"POST",headers:{"stripe-signature":signature},body:payload+" ",
  });
  assert.equal((await f.commerce.webhook(tampered)).status,400);
});

test("real-money wallet never mixes internal 3B Coins",async()=>{
  const f=fixture();
  const response=await f.commerce.creatorStatus(new Request(`${ORIGIN}/api/nosbloc-wallet`,{
    headers:{authorization:"Bearer fixture"},
  }));
  const data=await response.json();
  assert.deepEqual(data.real,{currency:"EUR",pendingCents:1200,availableCents:3400,paidOutCents:5600});
  assert.equal("coins" in data,false);
  assert.equal("points" in data,false);
});

test("pending commerce SQL is server-only, RLS-protected and ledger-immutable",()=>{
  const schema=readFileSync(new URL("../supabase/pending/20260926223000_nosbloc_creator_commerce_v2.sql",import.meta.url),"utf8");
  const server=readFileSync(new URL("../supabase/pending/20260926224500_nosbloc_creator_commerce_v2_server.sql",import.meta.url),"utf8");
  const frontend=readFileSync(new URL("../src/nosbloc/server-client.js",import.meta.url),"utf8");
  assert.match(schema,/nosbloc_real_money_ledger/i);
  assert.match(schema,/enable row level security/gi);
  assert.match(schema,/nosbloc_real_ledger_immutable/i);
  assert.match(schema,/security_invoker=true/i);
  assert.match(schema,/revoke all on public\.nosbloc_real_money_ledger from public,anon,authenticated/i);
  assert.match(schema,/grant select,insert on public\.nosbloc_real_money_ledger to service_role/i);
  assert.doesNotMatch(schema,/grant .*nosbloc_real_money_ledger.*authenticated/i);
  assert.match(server,/security invoker/gi);
  assert.match(server,/nosbloc_release_eligible_allocations_server/i);
  assert.match(server,/interval '14 days'/i);
  assert.match(server,/A dispute is a risk state, not an invented monetary movement/i);
  assert.doesNotMatch(frontend,/service_role|SUPABASE_SERVICE_ROLE_KEY/i);
});
