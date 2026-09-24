import Stripe from "stripe";

const TEST_PRICE_ID = "price_1UJHLHC3wYXh2i6ld1d3tXua";

function send(res, status, body) {
  res.status(status);
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.send(JSON.stringify(body));
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return send(res, 405, { error: "METHOD_NOT_ALLOWED" });
  }

  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) return send(res, 503, { error: "STRIPE_NOT_CONFIGURED" });

  const livePrice = process.env.PWA_QUICKKIT_PRO_PRICE_ID;
  const testEnabled = process.env.PWA_QUICKKIT_ENABLE_TEST_CHECKOUT === "1";
  const priceId = livePrice || (testEnabled ? TEST_PRICE_ID : "");

  if (!priceId) {
    return send(res, 503, {
      error: "CHECKOUT_NOT_ENABLED",
      message: "Le checkout Pro reste volontairement fermé tant que le prix live et les droits d'accès ne sont pas validés."
    });
  }

  try {
    const stripe = new Stripe(secret);
    const baseUrl = (process.env.PWA_QUICKKIT_PUBLIC_URL || "https://3b-international.vercel.app/pwa-quickkit/").replace(/\/+$/, "/");
    const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
    const email = typeof body.email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)
      ? body.email.trim().toLowerCase()
      : undefined;

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${baseUrl}?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}?checkout=cancelled`,
      allow_promotion_codes: true,
      customer_email: email,
      metadata: { product: "pwa-quickkit-pro" },
      subscription_data: { metadata: { product: "pwa-quickkit-pro" } }
    });

    return send(res, 200, { url: session.url });
  } catch (error) {
    console.error("PWA QuickKit checkout error", error?.type || error?.message);
    return send(res, 500, { error: "CHECKOUT_FAILED" });
  }
}
