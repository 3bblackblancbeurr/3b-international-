const SUPABASE_URL = "https://ttvhcezucsbbmnafrotq.supabase.co";
const PUBLIC_KEY = "sb_publishable_MQUCR8oNdpEgeO2iMKnLQw_wj5XdNC4";
const TARGET = `${SUPABASE_URL}/functions/v1/card-arena`;
const NATIVE_ORIGINS = new Set(["https://localhost", "capacitor://localhost"]);

function cors(origin) {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, content-type",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
  };
}

function json(data, status, origin) {
  return Response.json(data, {
    status,
    headers: {
      ...cors(origin),
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer",
    },
  });
}

async function readBody(request, maxBytes = 65536) {
  const declared = Number(request.headers.get("content-length") || 0);
  if (declared > maxBytes) throw new Error("too_large");
  if (!request.body) return "";
  const reader = request.body.getReader();
  const chunks = [];
  let size = 0;
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) {
        await reader.cancel().catch(() => {});
        throw new Error("too_large");
      }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  return Buffer.concat(chunks, size).toString("utf8");
}

export function createCardArenaProxy({ fetcher = fetch } = {}) {
  return async request => {
    const origin = request.headers.get("origin") || "";
    if (!NATIVE_ORIGINS.has(origin)) {
      return Response.json({ error: "Origine non autorisée." }, {
        status: 403,
        headers: { "Cache-Control": "no-store", "Vary": "Origin" },
      });
    }

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors(origin) });
    }
    if (request.method !== "POST") return json({ error: "Méthode non autorisée." }, 405, origin);
    if (!request.headers.get("content-type")?.startsWith("application/json")) {
      return json({ error: "Format invalide." }, 415, origin);
    }

    const authorization = request.headers.get("authorization") || "";
    if (!authorization.startsWith("Bearer ") || authorization.length > 4096) {
      return json({ error: "Reconnecte-toi à ton compte 3B." }, 401, origin);
    }

    let text;
    try { text = await readBody(request); }
    catch { return json({ error: "Requête trop volumineuse." }, 413, origin); }

    let body;
    try { body = JSON.parse(text); }
    catch { return json({ error: "Demande invalide." }, 400, origin); }
    if (!body || typeof body !== "object" || Array.isArray(body) || typeof body.action !== "string" || !body.action || body.action.length > 80) {
      return json({ error: "Action invalide." }, 400, origin);
    }

    let upstream;
    try {
      upstream = await fetcher(TARGET, {
        method: "POST",
        signal: AbortSignal.timeout(18000),
        headers: {
          "Content-Type": "application/json",
          apikey: PUBLIC_KEY,
          Authorization: authorization,
        },
        body: JSON.stringify(body),
      });
    } catch {
      return json({ error: "Connexion à l’Arène momentanément indisponible." }, 503, origin);
    }

    let responseText;
    try { responseText = await upstream.text(); }
    catch { return json({ error: "Connexion à l’Arène momentanément indisponible." }, 503, origin); }
    return new Response(responseText, {
      status: upstream.status,
      headers: {
        ...cors(origin),
        "Content-Type": upstream.headers.get("content-type") || "application/json; charset=utf-8",
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
        "Referrer-Policy": "no-referrer",
      },
    });
  };
}
