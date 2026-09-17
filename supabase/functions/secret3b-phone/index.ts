import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import twilio from "npm:twilio@6.1.1";
import { createClient } from "npm:@supabase/supabase-js@2.116.0";

const CAMPAIGN_SLUG = "telephone-secret-3b";
const XML_HEADERS = { "Content-Type": "text/xml; charset=utf-8", "Cache-Control": "no-store" };

function xmlEscape(value: unknown) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function twiml(...verbs: string[]) {
  return new Response(`<?xml version="1.0" encoding="UTF-8"?><Response>${verbs.join("")}</Response>`, {
    status: 200,
    headers: XML_HEADERS,
  });
}

function say(text: string) {
  return `<Say language="fr-FR">${xmlEscape(text)}</Say>`;
}

function hangup() {
  return "<Hangup/>";
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

async function deterministicClaimCode(secret: string, callSid: string, caller: string) {
  const digest = await hmacHex(secret, `secret3b-claim-code-v1:${callSid}:${caller}`);
  const value = BigInt(`0x${digest.slice(0, 16)}`) % 100_000_000n;
  return value.toString().padStart(8, "0");
}

function spacedDigits(value: string) {
  return value.split("").join(". ");
}

function getAdminClient() {
  const url = Deno.env.get("SUPABASE_URL");
  const secretMapRaw = Deno.env.get("SUPABASE_SECRET_KEYS");
  const legacySecret = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url) throw new Error("SUPABASE_URL missing");

  let key = legacySecret || "";
  if (secretMapRaw) {
    const parsed = JSON.parse(secretMapRaw);
    key = parsed.default || key;
  }
  if (!key) throw new Error("Supabase secret key missing");

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

async function loadContest(admin: ReturnType<typeof createClient>) {
  const { data: campaign, error: campaignError } = await admin
    .from("secret3b_campaigns")
    .select("id,status")
    .eq("slug", CAMPAIGN_SLUG)
    .maybeSingle();
  if (campaignError) throw campaignError;
  if (!campaign) return null;

  const { data: config, error: configError } = await admin
    .from("secret3b_phone_contests")
    .select("enabled,question_text,option_1_text,option_2_text,correct_digit,max_winners,opens_at,closes_at,intro_text,winner_text,wrong_text,late_text,duplicate_text")
    .eq("campaign_id", campaign.id)
    .maybeSingle();
  if (configError) throw configError;
  if (!config) return null;

  return { campaign, config };
}

function contestIsOpen(contest: Awaited<ReturnType<typeof loadContest>>) {
  if (!contest) return false;
  const { campaign, config } = contest;
  if (campaign.status !== "active" || !config.enabled || !config.correct_digit) return false;
  if (!config.question_text.trim() || !config.option_1_text.trim() || !config.option_2_text.trim()) return false;
  const now = Date.now();
  if (config.opens_at && now < Date.parse(config.opens_at)) return false;
  if (config.closes_at && now >= Date.parse(config.closes_at)) return false;
  return true;
}

function e164Caller(form: URLSearchParams) {
  const value = form.get("From") || form.get("Caller") || "";
  return /^\+[1-9]\d{7,14}$/.test(value) ? value : "";
}

Deno.serve(async (req: Request) => {
  if (req.method === "GET") {
    return Response.json({ ok: true, service: "secret3b-phone" }, {
      headers: { "Cache-Control": "no-store" },
    });
  }
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const authToken = Deno.env.get("TWILIO_AUTH_TOKEN");
  if (!authToken) {
    return new Response("Phone service not configured", { status: 503, headers: { "Cache-Control": "no-store" } });
  }

  const rawBody = await req.text();
  const form = new URLSearchParams(rawBody);
  const params: Record<string, string> = {};
  for (const [key, value] of form.entries()) params[key] = value;

  const signature = req.headers.get("x-twilio-signature") || "";
  if (!signature || !twilio.validateRequest(authToken, signature, req.url, params)) {
    return new Response("Forbidden", { status: 403, headers: { "Cache-Control": "no-store" } });
  }

  let admin;
  try {
    admin = getAdminClient();
  } catch (error) {
    console.error("secret3b-phone admin setup", error);
    return twiml(say("Le canal secret est momentanément indisponible."), hangup());
  }

  let contest;
  try {
    contest = await loadContest(admin);
  } catch (error) {
    console.error("secret3b-phone contest load", error);
    return twiml(say("Le canal secret est momentanément indisponible."), hangup());
  }

  if (!contestIsOpen(contest)) {
    return twiml(say("Le téléphone secret 3B n'est pas ouvert pour le moment."), hangup());
  }

  const caller = e164Caller(form);
  if (!caller) {
    return twiml(say("Pour participer, ton numéro de téléphone ne doit pas être masqué."), hangup());
  }

  const url = new URL(req.url);
  const step = url.searchParams.get("step") || "start";
  const config = contest!.config;

  if (step !== "answer") {
    url.searchParams.set("step", "answer");
    const action = xmlEscape(url.toString());
    const prompt = `${say(config.intro_text)}${say(config.question_text)}${say(`Pour ${config.option_1_text}, appuie sur 1.`)}${say(`Pour ${config.option_2_text}, appuie sur 2.`)}`;
    return twiml(
      `<Gather input="dtmf" numDigits="1" timeout="10" actionOnEmptyResult="true" method="POST" action="${action}">${prompt}</Gather>`,
      say("Aucune réponse reçue. La transmission est terminée."),
      hangup(),
    );
  }

  const digit = form.get("Digits") || "";
  if (digit !== "1" && digit !== "2") {
    return twiml(say("Aucune réponse valide n'a été reçue. La transmission est terminée."), hangup());
  }

  const callSid = form.get("CallSid") || "";
  if (!callSid) return twiml(say("Appel invalide."), hangup());

  const callerHash = await hmacHex(authToken, `secret3b-caller-v1:${caller}`);
  const claimCode = await deterministicClaimCode(authToken, callSid, caller);
  const claimTokenHash = await hmacHex(authToken, `secret3b-claim-v1:${claimCode}`);

  const { data, error } = await admin.rpc("secret3b_claim_phone_answer", {
    p_campaign_slug: CAMPAIGN_SLUG,
    p_call_sid: callSid,
    p_caller_hash: callerHash,
    p_digit: digit,
    p_claim_token_hash: claimTokenHash,
    p_caller_ciphertext: null,
  });

  if (error) {
    console.error("secret3b-phone answer claim", error);
    return twiml(say("Une erreur technique a interrompu la transmission. Aucun résultat n'a été modifié."), hangup());
  }

  const result = Array.isArray(data) ? data[0] : data;
  switch (result?.result) {
    case "winner":
      return twiml(
        say(config.winner_text),
        say(`Tu es le gagnant numéro ${result.winner_rank}.`),
        say(`Ton code gagnant est ${spacedDigits(claimCode)}. Note ce code et conserve-le. Il servira à réclamer ton pull dans l'application 3B.`),
        hangup(),
      );
    case "wrong":
      return twiml(say(config.wrong_text), hangup());
    case "correct_too_late":
      return twiml(say(config.late_text), hangup());
    case "duplicate":
      return twiml(say(config.duplicate_text), hangup());
    default:
      return twiml(say("Le téléphone secret 3B n'est pas ouvert pour le moment."), hangup());
  }
});
