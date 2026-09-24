import { createHmac } from "node:crypto";

function safeHttpsUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password ? url.href : "";
  } catch { return ""; }
}

function clientAddress(request) {
  const raw = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || request.headers.get("x-real-ip")?.trim()
    || "";
  if (!raw || raw.length > 80 || !/^[0-9a-fA-F:.]+$/.test(raw)) return "";
  return raw;
}

export async function consumePwaQuickKitRateLimit(request, { env = process.env, fetcher = fetch } = {}) {
  const base = safeHttpsUrl(env.SUPABASE_URL);
  const secret = env.SUPABASE_SERVICE_ROLE_KEY;
  const ip = clientAddress(request);
  if (!base || !secret || !ip) return { allowed: true, limited: false };

  const key = createHmac("sha256", env.PWA_QUICKKIT_RATE_LIMIT_SECRET || secret)
    .update(`pwa-quickkit-audit:${ip}`)
    .digest("hex");
  const url = new URL("/rest/v1/rpc/pwa_quickkit_consume_rate_limit", base);

  try {
    const response = await fetcher(url, {
      method: "POST",
      signal: AbortSignal.timeout(8000),
      headers: {
        apikey: secret,
        Authorization: `Bearer ${secret}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ p_key: key, p_limit: 30, p_window_minutes: 1440 }),
    });
    if (!response.ok) return { allowed: false, limited: false, unavailable: true };
    return { allowed: Boolean(await response.json()), limited: true };
  } catch {
    return { allowed: false, limited: false, unavailable: true };
  }
}
