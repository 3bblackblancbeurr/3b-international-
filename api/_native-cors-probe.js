const PROJECT = "ttvhcezucsbbmnafrotq";
const FUNCTIONS = ["member-hub", "ecosystem", "world-engine", "card-arena"];
const ORIGINS = ["https://localhost", "capacitor://localhost", "https://example.invalid"];

export default {
  async fetch(request) {
    if (request.method !== "GET") return Response.json({ error: "Method not allowed" }, { status: 405 });
    const results = [];
    for (const fn of FUNCTIONS) {
      for (const origin of ORIGINS) {
        try {
          const response = await fetch(`https://${PROJECT}.supabase.co/functions/v1/${fn}`, {
            method: "OPTIONS",
            headers: {
              Origin: origin,
              "Access-Control-Request-Method": "POST",
              "Access-Control-Request-Headers": "authorization,apikey,content-type,x-client-info",
            },
            redirect: "manual",
            signal: AbortSignal.timeout(10000),
          });
          results.push({
            function: fn,
            origin,
            status: response.status,
            allowOrigin: response.headers.get("access-control-allow-origin"),
            allowMethods: response.headers.get("access-control-allow-methods"),
          });
        } catch (error) {
          results.push({ function: fn, origin, error: error?.name || "fetch_failed" });
        }
      }
    }
    return Response.json({ results }, { headers: { "Cache-Control": "no-store" } });
  },
};
