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

function fixture() {
  const claims = new Set();
  const calls = { email:[], sms:[], patches:[] };
  const fetcher = async (input, options = {}) => {
    const url = new URL(String(input));
    if (url.hostname === "db.example.test") {
      if (options.method === "POST") {
        const row = JSON.parse(options.body);
        const key = `${row.stripe_session_id}|${row.event}|${row.channel}`;
        if (claims.has(key)) return Response.json([], { status:201 });
        claims.add(key); return Response.json([row], { status:201 });
      }
      if (options.method === "PATCH") { calls.patches.push(JSON.parse(options.body)); return new Response(null, { status:204 }); }
    }
    if (url.hostname === "api.resend.com") {
      calls.email.push({ body:JSON.parse(options.body), headers:options.headers });
      return Response.json({ id:`email_${calls.email.length}` }, { status:200 });
    }
    if (url.hostname === "api.twilio.com") {
      calls.sms.push({ body:String(options.body), headers:options.headers });
      return Response.json({ sid:`SM${String(calls.sms.length).padStart(32,"0")}` }, { status:201 });
    }
    throw new Error(`unexpected ${url.href}`);
  };
  return { fetcher, calls };
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
