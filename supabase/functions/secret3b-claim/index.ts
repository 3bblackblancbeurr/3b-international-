import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.116.0";

const CAMPAIGN_SLUG = "telephone-secret-3b";
const DEFAULT_ALLOWED_ORIGINS = [
  "https://3b-international.vercel.app",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
];

function readKeyMap(name: string) {
  const raw = Deno.env.get(name) || "";
  if (!raw) return {} as Record<string, string>;
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {} as Record<string, string>;
  }
}

function publicKey() {
  const mapped = readKeyMap("SUPABASE_PUBLISHABLE_KEYS");
  return mapped.default || Deno.env.get("SUPABASE_ANON_KEY") || "";
}

function secretKey() {
  const mapped = readKeyMap("SUPABASE_SECRET_KEYS");
  return mapped.default || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
}

function allowedOrigins() {
  const extra = (Deno.env.get("SECRET3B_ALLOWED_ORIGINS") || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  return new Set([...DEFAULT_ALLOWED_ORIGINS, ...extra]);
}

function corsHeaders(req: Request) {
  const origin = req.headers.get("origin") || "";
  const allowed = allowedOrigins();
  const chosen = allowed.has(origin) ? origin : DEFAULT_ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": chosen,
    "Access-Control-Allow-Headers": "authorization, apikey, content-type",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Max-Age": "600",
    "Cache-Control": "no-store",
    "Vary": "Origin",
  };
}

function json(req: Request, body: unknown, status = 200) {
  return Response.json(body, {
    status,
    headers: { ...corsHeaders(req), "Content-Type": "application/json; charset=utf-8" },
  });
}

function validOrigin(req: Request) {
  const origin = req.headers.get("origin");
  return !origin || allowedOrigins().has(origin);
}

function adminClient() {
  const url = Deno.env.get("SUPABASE_URL") || "";
  const key = secretKey();
  if (!url || !key) throw new Error("Supabase admin configuration missing");
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

async function authenticatedUser(req: Request) {
  const authHeader = req.headers.get("authorization") || "";
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!match) return null;

  const url = Deno.env.get("SUPABASE_URL") || "";
  const key = publicKey();
  if (!url || !key) throw new Error("Supabase public configuration missing");

  const client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const { data, error } = await client.auth.getUser(match[1]);
  if (error || !data.user) return null;
  return data.user;
}

function bytesToHex(bytes: Uint8Array) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function hmacHex(secret: string, value: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value));
  return bytesToHex(new Uint8Array(signature));
}

function clean(value: unknown, max: number) {
  return String(value ?? "").trim().slice(0, max);
}

async function claimStatus(admin: ReturnType<typeof createClient>, userId: string) {
  const { data: campaign, error: campaignError } = await admin
    .from("secret3b_campaigns")
    .select("id")
    .eq("slug", CAMPAIGN_SLUG)
    .maybeSingle();
  if (campaignError) throw campaignError;
  if (!campaign) return { claimed: false };

  const { data: winner, error: winnerError } = await admin
    .from("secret3b_phone_winners")
    .select("winner_rank,claimed_at")
    .eq("campaign_id", campaign.id)
    .eq("claimed_by", userId)
    .maybeSingle();
  if (winnerError) throw winnerError;
  if (!winner) return { claimed: false };
  return { claimed: true, winnerRank: winner.winner_rank, claimedAt: winner.claimed_at };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: corsHeaders(req) });
  }
  if (!validOrigin(req)) return json(req, { error: "Origine refusée." }, 403);
  if (req.method !== "GET" && req.method !== "POST") {
    return json(req, { error: "Méthode non autorisée." }, 405);
  }

  let user;
  try {
    user = await authenticatedUser(req);
  } catch (error) {
    console.error("secret3b-claim auth setup", error);
    return json(req, { error: "Service momentanément indisponible." }, 503);
  }
  if (!user) return json(req, { error: "Connecte-toi à ton compte 3B pour réclamer un lot." }, 401);

  let admin;
  try {
    admin = adminClient();
  } catch (error) {
    console.error("secret3b-claim admin setup", error);
    return json(req, { error: "Service momentanément indisponible." }, 503);
  }

  if (req.method === "GET") {
    try {
      return json(req, await claimStatus(admin, user.id));
    } catch (error) {
      console.error("secret3b-claim status", error);
      return json(req, { error: "Impossible de vérifier ton lot pour le moment." }, 500);
    }
  }

  const contestSecret = Deno.env.get("SECRET3B_CONTEST_SECRET") || "";
  if (contestSecret.length < 32) {
    return json(req, { error: "La réclamation des lots n'est pas encore activée." }, 503);
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json(req, { error: "Requête invalide." }, 400);
  }

  const code = String(body.code ?? "").replace(/\D/g, "");
  const recipientName = clean(body.recipientName, 100);
  const hoodieSize = clean(body.hoodieSize, 16).toUpperCase();
  const addressLine1 = clean(body.addressLine1, 160);
  const addressLine2 = clean(body.addressLine2, 160);
  const postalCode = clean(body.postalCode, 24);
  const city = clean(body.city, 100);
  const country = clean(body.country, 80);

  if (!/^\d{8}$/.test(code)) return json(req, { error: "Le code gagnant doit contenir exactement 8 chiffres." }, 400);
  if (recipientName.length < 2 || hoodieSize.length < 1 || addressLine1.length < 3 || postalCode.length < 2 || city.length < 2 || country.length < 2) {
    return json(req, { error: "Complète tous les champs obligatoires." }, 400);
  }

  const claimTokenHash = await hmacHex(contestSecret, `secret3b-claim-v1:${code}`);
  const { data, error } = await admin.rpc("secret3b_claim_phone_prize", {
    p_campaign_slug: CAMPAIGN_SLUG,
    p_claim_token_hash: claimTokenHash,
    p_user_id: user.id,
    p_recipient_name: recipientName,
    p_hoodie_size: hoodieSize,
    p_address_line1: addressLine1,
    p_address_line2: addressLine2,
    p_postal_code: postalCode,
    p_city: city,
    p_country: country,
  });

  if (error) {
    console.error("secret3b-claim rpc", error);
    return json(req, { error: "La vérification du code a échoué. Réessaie plus tard." }, 500);
  }

  const result = Array.isArray(data) ? data[0] : data;
  switch (result?.result) {
    case "claimed":
      return json(req, {
        ok: true,
        claimed: true,
        winnerRank: result.winner_rank,
        message: `Lot gagnant n°${result.winner_rank} enregistré.`,
      });
    case "invalid_code":
      return json(req, { error: "Ce code gagnant n'est pas reconnu." }, 400);
    case "code_already_used":
      return json(req, { error: "Ce code gagnant a déjà été utilisé." }, 409);
    case "account_already_claimed":
      return json(req, { error: "Ce compte 3B a déjà réclamé un lot de cette opération." }, 409);
    case "rate_limited":
      return json(req, { error: "Trop d'essais. Réessaie dans environ 15 minutes." }, 429);
    case "invalid_input":
      return json(req, { error: "Les informations de livraison sont incomplètes ou invalides." }, 400);
    default:
      return json(req, { error: "La réclamation n'est pas disponible pour le moment." }, 503);
  }
});
