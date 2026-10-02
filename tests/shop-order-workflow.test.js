import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { configFrom } from "../server/shop.js";
import { createShopOrders } from "../server/shop-orders.js";

const ORIGIN = "https://3b-international.vercel.app";
const USER = "11111111-1111-4111-8111-111111111111";
const AUTH_SESSION = "22222222-2222-4222-8222-222222222222";
const TOKEN = `header.${Buffer.from(JSON.stringify({session_id:AUTH_SESSION})).toString("base64url")}.signature`;
const SESSION = "cs_test_1234567890";
const env = { SUPABASE_URL:"https://db.example.test", SUPABASE_SERVICE_ROLE_KEY:"service-key" };

function response(data, status=200) {
  return data === null ? new Response(null, {status}) : Response.json(data, {status});
}

function authRequest(url, options={}) {
  return new Request(url, { ...options, headers:{ authorization:`Bearer ${TOKEN}`, ...(options.headers || {}) } });
}

test("included shipping can enable checkout without a Stripe shipping-rate id", () => {
  const common = {
    SHOP_ENABLED:"true", SHOP_RELEASE_APPROVED:"true", SHOP_CHECKOUT_COOKIE_SECRET:"fixture-cookie-secret-3b-at-least-32-chars",
    APP_URL:ORIGIN, STRIPE_SECRET_KEY:"sk_test_fixture", STRIPE_WEBHOOK_SECRET:"whsec_fixture",
    STRIPE_CATALOG_MODE:"metadata", SHOP_SHIPPING_COUNTRIES:"FR", SHOP_AUTOMATIC_TAX:"false",
    SUPABASE_URL:"https://db.example.test", SUPABASE_SERVICE_ROLE_KEY:"service-key",
    SHOP_TERMS_URL:`${ORIGIN}/sales-terms.html`, SHOP_PRIVACY_URL:`${ORIGIN}/privacy-policy.html`,
    SHOP_SHIPPING_URL:`${ORIGIN}/shipping.html`, SHOP_RETURNS_URL:`${ORIGIN}/returns.html`, SHOP_LEGAL_URL:`${ORIGIN}/legal-notice.html`,
  };
  assert.equal(configFrom({...common, SHOP_SHIPPING_INCLUDED:"true"}).enabled, true);
  assert.equal(configFrom(common).enabled, false);
  assert.equal(configFrom({...common, STRIPE_SHIPPING_RATE_ID:"shr_fixture"}).enabled, true);
});

test("seller acceptance is server-authorized and starts the two-day shipping clock", async () => {
  let patch;
  const created = new Date("2026-09-16T10:00:00Z").toISOString();
  const fetcher = async (url, options={}) => {
    const u = new URL(url);
    if (u.pathname === "/auth/v1/user") return response({id:USER});
    if (u.pathname === "/rest/v1/rpc/loyalty_session_valid") return response(true);
    if (u.pathname === "/rest/v1/shop_staff") return response([{user_id:USER,role:"seller"}]);
    if (u.pathname === "/rest/v1/shop_orders" && options.method === "PATCH") {
      assert.equal(u.searchParams.get("fulfillment_status"), "eq.awaiting_seller");
      assert.equal(u.searchParams.get("payment_status"), "eq.paid");
      assert.equal(options.headers.Prefer, "return=representation");
      patch = JSON.parse(options.body); return response([{stripe_session_id:SESSION}]);
    }
    if (u.pathname === "/rest/v1/shop_orders") return response([{
      stripe_session_id:SESSION, fulfillment_status:"awaiting_seller", created_at:created,
      seller_due_at:new Date("2026-09-21T10:00:00Z").toISOString(), seller_accepted_at:null,
      ship_due_at:null, shipped_at:null, amount_total:8000, currency:"eur", items:[]
    }]);
    throw new Error(`Unexpected ${u.pathname}`);
  };
  const api = createShopOrders({env, fetcher});
  const request = authRequest(`${ORIGIN}/api/shop-admin-orders`, {
    method:"POST", headers:{"content-type":"application/json"}, body:JSON.stringify({sessionId:SESSION, action:"accept"})
  });
  const result = await api.admin(request);
  assert.equal(result.status, 200);
  assert.equal(patch.fulfillment_status, "processing");
  assert.equal(patch.seller_user_id, USER);
  const accepted = new Date(patch.seller_accepted_at).getTime();
  const due = new Date(patch.ship_due_at).getTime();
  assert.ok(due - accepted >= 2*86400000 - 1000 && due - accepted <= 2*86400000 + 1000);
});

test("community moderators are not implicitly authorized to view or change seller orders", async () => {
  const fetcher = async (url) => {
    const u = new URL(url);
    if (u.pathname === "/auth/v1/user") return response({id:USER});
    if (u.pathname === "/rest/v1/rpc/loyalty_session_valid") return response(true);
    if (u.pathname === "/rest/v1/shop_staff") return response([]);
    if (u.pathname === "/rest/v1/community_staff") throw new Error("Community moderation must not grant seller access");
    throw new Error("Seller data must not be read for non-staff users");
  };
  const api = createShopOrders({env, fetcher});
  const res = await api.admin(authRequest(`${ORIGIN}/api/shop-admin-orders`));
  assert.equal(res.status, 403);
});

test("customer order tracking exposes status and deadlines but not private delivery data", async () => {
  const fetcher = async (url) => {
    const u = new URL(url);
    if (u.pathname === "/auth/v1/user") return response({id:USER});
    if (u.pathname === "/rest/v1/rpc/loyalty_session_valid") return response(true);
    if (u.pathname === "/rest/v1/member_purchase_rewards") return response([{session_id:SESSION}]);
    if (u.pathname === "/rest/v1/shop_orders") {
      assert.equal(u.searchParams.get("or"), `(loyalty_user_id.eq.${USER},stripe_session_id.in.(${SESSION}))`);
      return response([{
      stripe_session_id:SESSION, fulfillment_status:"processing", amount_total:8000, currency:"eur",
      amount_refunded:2000, refund_status:"partial", refunded_at:"2026-09-18T10:00:00Z",
      items:[{description:"Pull 3B International", color:"Noir", logo_country:"France", quantity:1}],
      created_at:"2026-09-16T10:00:00Z", seller_due_at:"2026-09-21T10:00:00Z",
      seller_accepted_at:"2026-09-17T10:00:00Z", ship_due_at:"2026-09-19T10:00:00Z", shipped_at:null,
      customer_email:"private@example.test", shipping_details:{address:{line1:"secret"}}
      }]);
    }
    throw new Error(`Unexpected ${u.pathname}`);
  };
  const api = createShopOrders({env, fetcher});
  const res = await api.mine(authRequest(`${ORIGIN}/api/my-orders`));
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.orders[0].fulfillmentStatus, "processing");
  assert.equal(data.orders[0].amount, 8000);
  assert.equal(data.orders[0].amountRefunded, 2000);
  assert.equal(data.orders[0].refundStatus, "partial");
  assert.equal(data.orders[0].items[0].logo_country, "France");
  assert.equal("customerEmail" in data.orders[0], false);
  assert.equal("shipping" in data.orders[0], false);
});

test("revoked sessions cannot read customer data or access the seller console", async () => {
  for (const endpoint of ["mine", "admin"]) {
    const calls = [];
    const fetcher = async (url, options={}) => {
      const path = new URL(url).pathname;
      calls.push(path);
      if (path === "/auth/v1/user") return response({id:USER});
      if (path === "/rest/v1/rpc/loyalty_session_valid") {
        assert.deepEqual(JSON.parse(options.body), {p_user:USER, p_session:AUTH_SESSION});
        return response(false);
      }
      throw new Error("A revoked session must not access order or staff data");
    };
    const res = await createShopOrders({env, fetcher})[endpoint](authRequest(`${ORIGIN}/api/orders`));
    assert.equal(res.status, 401);
    assert.deepEqual(calls, ["/auth/v1/user", "/rest/v1/rpc/loyalty_session_valid"]);
  }
});

test("invalid or missing session claims are rejected before privileged database access", async () => {
  for (const token of ["not-a-jwt", `header.${Buffer.from(JSON.stringify({session_id:"invalid"})).toString("base64url")}.signature`]) {
    let calls = 0;
    const fetcher = async url => {
      assert.equal(new URL(url).pathname, "/auth/v1/user");
      calls++;
      return response({id:USER});
    };
    const res = await createShopOrders({env, fetcher}).mine(authRequest(`${ORIGIN}/api/my-orders`, {headers:{authorization:`Bearer ${token}`}}));
    assert.equal(res.status, 401);
    assert.equal(calls, 1);
  }
});

test("an owned paid order remains visible before loyalty rewards have settled", async () => {
  const fetcher = async url => {
    const u = new URL(url);
    if (u.pathname === "/auth/v1/user") return response({id:USER});
    if (u.pathname === "/rest/v1/rpc/loyalty_session_valid") return response(true);
    if (u.pathname === "/rest/v1/member_purchase_rewards") return response([]);
    assert.equal(u.pathname, "/rest/v1/shop_orders");
    assert.equal(u.searchParams.get("loyalty_user_id"), `eq.${USER}`);
    assert.equal(u.searchParams.get("payment_status"), "eq.paid");
    assert.equal(u.searchParams.get("limit"), "30");
    return response([{stripe_session_id:SESSION, fulfillment_status:"awaiting_seller", amount_total:8000}]);
  };
  const res = await createShopOrders({env, fetcher}).mine(authRequest(`${ORIGIN}/api/my-orders`));
  assert.equal(res.status, 200);
  assert.equal((await res.json()).orders[0].sessionId, SESSION);
});

test("simultaneous seller acceptance commits exactly one transition", async () => {
  let reads = 0, writes = 0;
  let current = "awaiting_seller";
  let releaseReads;
  const bothRead = new Promise(resolve => { releaseReads = resolve; });
  const fetcher = async (url, options={}) => {
    const u = new URL(url);
    if (u.pathname === "/auth/v1/user") return response({id:USER});
    if (u.pathname === "/rest/v1/rpc/loyalty_session_valid") return response(true);
    if (u.pathname === "/rest/v1/shop_staff") return response([{user_id:USER,role:"seller"}]);
    assert.equal(u.pathname, "/rest/v1/shop_orders");
    assert.equal(u.searchParams.get("payment_status"), "eq.paid");
    if (options.method === "PATCH") {
      if (u.searchParams.get("fulfillment_status") !== `eq.${current}`) return response([]);
      current = JSON.parse(options.body).fulfillment_status;
      writes++;
      return response([{stripe_session_id:SESSION}]);
    }
    const snapshot = {stripe_session_id:SESSION, fulfillment_status:current, created_at:"2026-09-16T10:00:00Z"};
    if (++reads === 2) releaseReads();
    await bothRead;
    return response([snapshot]);
  };
  const api = createShopOrders({env, fetcher});
  const accept = () => api.admin(authRequest(`${ORIGIN}/api/shop-admin-orders`, {
    method:"POST", headers:{"content-type":"application/json"}, body:JSON.stringify({sessionId:SESSION, action:"accept"}),
  }));
  const responses = await Promise.all([accept(), accept()]);
  assert.deepEqual(responses.map(res => res.status).sort(), [200, 409]);
  assert.equal(writes, 1);
  assert.equal(current, "processing");
});

test("a stale seller action cannot overwrite a cancelled or shipped order", async () => {
  for (const action of ["accept", "ship"]) {
    const fetcher = async (url, options={}) => {
      const u = new URL(url);
      if (u.pathname === "/auth/v1/user") return response({id:USER});
      if (u.pathname === "/rest/v1/rpc/loyalty_session_valid") return response(true);
      if (u.pathname === "/rest/v1/shop_staff") return response([{user_id:USER,role:"seller"}]);
      if (options.method === "PATCH") {
        assert.equal(u.searchParams.get("fulfillment_status"), action === "accept" ? "eq.new" : "eq.processing");
        return response([]);
      }
      return response([{stripe_session_id:SESSION, fulfillment_status:action === "accept" ? "new" : "processing", created_at:"2026-09-16T10:00:00Z"}]);
    };
    const res = await createShopOrders({env, fetcher}).admin(authRequest(`${ORIGIN}/api/shop-admin-orders`, {
      method:"POST", headers:{"content-type":"application/json"}, body:JSON.stringify({sessionId:SESSION, action}),
    }));
    assert.equal(res.status, 409);
  }
});

test("refunded orders cannot be accepted or marked as shipped", async () => {
  let writes=0;
  const fetcher=async (url,options={})=>{
    const u=new URL(url);
    if(u.pathname==="/auth/v1/user")return response({id:USER});
    if(u.pathname==="/rest/v1/rpc/loyalty_session_valid")return response(true);
    if(u.pathname==="/rest/v1/shop_staff")return response([{user_id:USER,role:"seller"}]);
    if(options.method==="PATCH"){writes++;return response([]);}
    return response([{stripe_session_id:SESSION,fulfillment_status:"refunded",refund_status:"partial",amount_refunded:2000,amount_total:8000,created_at:"2026-09-16T10:00:00Z"}]);
  };
  for(const action of ["accept","ship"]){
    const res=await createShopOrders({env,fetcher}).admin(authRequest(`${ORIGIN}/api/shop-admin-orders`,{
      method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({sessionId:SESSION,action}),
    }));
    assert.equal(res.status,409);
  }
  assert.equal(writes,0);
});

test("shop hardening migration applies refunds atomically and keeps seller authorization private", () => {
  const migration=readFileSync(new URL("../supabase/migrations/20261002184542_shop_checkout_hardening_v1.sql",import.meta.url),"utf8");
  assert.match(migration,/create table if not exists public\.shop_staff/);
  assert.match(migration,/revoke all on table public\.shop_staff from public, anon, authenticated/);
  assert.match(migration,/create or replace function public\.shop_apply_refund/);
  assert.match(migration,/for update/);
  assert.match(migration,/fulfillment_status = 'refunded'/);
  assert.match(migration,/p_amount_refunded <= v_order\.amount_refunded/);
});

test("shop hardening migration executes against the deployed shop contract", async () => {
  const migration=readFileSync(new URL("../supabase/migrations/20261002184542_shop_checkout_hardening_v1.sql",import.meta.url),"utf8");
  const db=new PGlite();
  try {
    await db.exec(`
      create role anon;
      create role authenticated;
      create role service_role;
      create schema auth;
      create table auth.users(id uuid primary key);
      create table public.shop_orders(
        stripe_session_id text primary key,
        payment_intent_id text,
        livemode boolean not null default false,
        payment_status text not null default 'paid',
        fulfillment_status text not null default 'awaiting_seller',
        amount_total bigint not null,
        updated_at timestamptz not null default now()
      );
      create table public.shop_notification_log(
        stripe_session_id text not null,
        event text not null,
        channel text not null,
        state text not null,
        attempts integer not null default 0,
        provider_id text,
        last_error text,
        updated_at timestamptz not null default now(),
        unique(stripe_session_id,event,channel)
      );
    `);
    await db.exec(migration);
    const result=await db.query(`
      select
        to_regclass('public.shop_staff') is not null as shop_staff_exists,
        to_regprocedure('public.shop_apply_refund(text,boolean,bigint,bigint)') is not null as refund_rpc_exists,
        to_regprocedure('public.shop_claim_notification(text,text,text,integer)') is not null as notification_rpc_exists
    `);
    assert.deepEqual(result.rows,[{
      shop_staff_exists:true,
      refund_rpc_exists:true,
      notification_rpc_exists:true,
    }]);
  } finally {
    await db.close();
  }
});

test("seller UI surfaces action errors and reloads the server state after a conflict", () => {
  const source = readFileSync(new URL("../src/shop/OrderPanels.jsx", import.meta.url), "utf8");
  assert.match(source, /if \(!response\.ok\) throw Object\.assign\(new Error\([^\n]+\), \{ status:response\.status \}\)/);
  const action = source.slice(source.indexOf("  async function action("), source.indexOf("  if (!enabled) return null;", source.indexOf("  async function action(")));
  assert.match(action, /setActionError\(""\)/);
  assert.match(action, /catch \(error\) \{\s*setActionError\(/);
  assert.match(action, /if \(error\.status === 409\) await load\(\)/);
  assert.match(action, /finally \{ setBusy\(""\); \}/);
  assert.match(source, /\{actionError && <p role="alert">\{actionError\}<\/p>\}/);
});
