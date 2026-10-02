import test from "node:test";
import assert from "node:assert/strict";
import { notifySellerPurchase, notifyClientStatus } from "../server/shop-notifications.js";

const env = {
  APP_URL:"https://3b.example.test",
  SUPABASE_URL:"https://db.example.test",
  SUPABASE_SERVICE_ROLE_KEY:"service_fixture",
  SHOP_SELLER_EMAIL:"seller@example.test",
  RESEND_API_KEY:"re_fixture",
  RESEND_FROM:"3B <commandes@example.test>",
  SHOP_SELLER_PHONE:"+33612345678",
  TWILIO_ACCOUNT_SID:"AC" + "1".repeat(32),
  TWILIO_AUTH_TOKEN:"twilio_fixture",
  TWILIO_FROM:"+33123456789",
};

function fixture({ emailFailures=0, smsFailures=0 } = {}) {
  const notifications = new Map();
  const calls = { email:[], sms:[], patches:[] };
  const keyFor = (sessionId,event,channel) => `${sessionId}|${event}|${channel}`;
  const fetcher = async (input, options = {}) => {
    const url = new URL(String(input));
    if (url.hostname === "db.example.test") {
      if (url.pathname === "/rest/v1/rpc/shop_claim_notification" && options.method === "POST") {
        const body = JSON.parse(options.body);
        const key = keyFor(body.p_session_id,body.p_event,body.p_channel);
        const current = notifications.get(key);
        if (!current) {
          notifications.set(key,{state:"pending",attempts:1,updatedAt:Date.now()});
          return Response.json(1);
        }
        const stale = current.state === "pending" && current.updatedAt < Date.now()-5*60*1000;
        if ((current.state === "failed" || stale) && current.attempts < body.p_max_attempts) {
          Object.assign(current,{state:"pending",attempts:current.attempts+1,updatedAt:Date.now(),providerId:null,lastError:null});
          return Response.json(current.attempts);
        }
        return Response.json(0);
      }
      if (url.pathname === "/rest/v1/shop_notification_log" && options.method === "PATCH") {
        const sessionId=(url.searchParams.get("stripe_session_id")||"").slice(3);
        const event=(url.searchParams.get("event")||"").slice(3);
        const channel=(url.searchParams.get("channel")||"").slice(3);
        const attempt=Number((url.searchParams.get("attempts")||"").slice(3));
        const current=notifications.get(keyFor(sessionId,event,channel));
        const patch=JSON.parse(options.body);calls.patches.push(patch);
        if(current?.state==="pending"&&current.attempts===attempt)Object.assign(current,{state:patch.state,providerId:patch.provider_id,lastError:patch.last_error,updatedAt:Date.now()});
        return new Response(null,{status:204});
      }
    }
    if (url.hostname === "api.resend.com") {
      calls.email.push({ body:JSON.parse(options.body), headers:options.headers });
      if (emailFailures-- > 0) return Response.json({error:"temporary"},{status:503});
      return Response.json({ id:`email_${calls.email.length}` }, { status:200 });
    }
    if (url.hostname === "api.twilio.com") {
      calls.sms.push({ body:String(options.body), headers:options.headers });
      if (smsFailures-- > 0) return Response.json({error:"temporary"},{status:503});
      return Response.json({ sid:`SM${String(calls.sms.length).padStart(32,"0")}` }, { status:201 });
    }
    throw new Error(`unexpected ${url.href}`);
  };
  return { fetcher, calls, notifications,
    setNotification:(sessionId,event,channel,value)=>notifications.set(keyFor(sessionId,event,channel),value),
    notification:(sessionId,event,channel)=>notifications.get(keyFor(sessionId,event,channel)) };
}

const order = {
  sessionId:"cs_test_notification_fixture",
  amountTotal:8000,
  currency:"eur",
  customerName:"Client Test",
  customerEmail:"client@example.test",
  shipping:{ address:{ line1:"1 rue Test", postal_code:"75001", city:"Paris", country:"FR" } },
  items:[{ description:"Pull 3B International", color:"Noir", logo_country:"France", quantity:1 }],
};

test("a paid order sends one seller email and one seller SMS even if invoked twice", async () => {
  const f = fixture();
  await notifySellerPurchase({ env, fetcher:f.fetcher, order });
  await notifySellerPurchase({ env, fetcher:f.fetcher, order });
  assert.equal(f.calls.email.length, 1);
  assert.equal(f.calls.sms.length, 1);
  assert.match(f.calls.email[0].body.subject, /Nouvelle commande 3B payée/);
  assert.match(f.calls.email[0].body.html, /Noir/);
  assert.match(f.calls.email[0].body.html, /France/);
  assert.match(f.calls.sms[0].body, /To=%2B33612345678/);
  assert.equal(f.calls.patches.filter(row => row.state === "sent").length, 2);
});

test("seller acceptance emails the customer without sending a customer SMS", async () => {
  const f = fixture();
  await notifyClientStatus({ env, fetcher:f.fetcher, order:{ ...order, sessionId:"cs_test_client_status" }, event:"seller_accepted" });
  assert.equal(f.calls.email.length, 1);
  assert.equal(f.calls.sms.length, 0);
  assert.equal(f.calls.email[0].body.to[0], "client@example.test");
  assert.match(f.calls.email[0].body.subject, /prise en charge/);
  assert.match(f.calls.email[0].body.text, /expédition est prévue sous 2 jours/);
});

test("notification providers are optional and never block the order workflow", async () => {
  const f = fixture();
  await notifySellerPurchase({ env:{ APP_URL:env.APP_URL, SUPABASE_URL:env.SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY:env.SUPABASE_SERVICE_ROLE_KEY }, fetcher:f.fetcher, order });
  assert.equal(f.calls.email.length, 0);
  assert.equal(f.calls.sms.length, 0);
});

test("a failed provider delivery can be retried and then remains deduplicated", async () => {
  const f=fixture({emailFailures:1});
  const retryOrder={...order,sessionId:"cs_test_retry_notification"};
  await notifyClientStatus({env,fetcher:f.fetcher,order:retryOrder,event:"seller_accepted"});
  assert.equal(f.notification(retryOrder.sessionId,"seller_accepted","email").state,"failed");
  await notifyClientStatus({env,fetcher:f.fetcher,order:retryOrder,event:"seller_accepted"});
  await notifyClientStatus({env,fetcher:f.fetcher,order:retryOrder,event:"seller_accepted"});
  assert.equal(f.calls.email.length,2);
  assert.equal(f.notification(retryOrder.sessionId,"seller_accepted","email").attempts,2);
  assert.equal(f.notification(retryOrder.sessionId,"seller_accepted","email").state,"sent");
});

test("a stale pending notification is reclaimed atomically by only one worker", async () => {
  const f=fixture();
  const retryOrder={...order,sessionId:"cs_test_stale_notification"};
  f.setNotification(retryOrder.sessionId,"seller_accepted","email",{state:"pending",attempts:1,updatedAt:Date.now()-6*60*1000});
  await Promise.all([
    notifyClientStatus({env,fetcher:f.fetcher,order:retryOrder,event:"seller_accepted"}),
    notifyClientStatus({env,fetcher:f.fetcher,order:retryOrder,event:"seller_accepted"}),
  ]);
  assert.equal(f.calls.email.length,1);
  assert.equal(f.notification(retryOrder.sessionId,"seller_accepted","email").attempts,2);
  assert.equal(f.notification(retryOrder.sessionId,"seller_accepted","email").state,"sent");
});
