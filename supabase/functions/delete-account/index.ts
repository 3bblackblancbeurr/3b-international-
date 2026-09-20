const BASE = Deno.env.get('SUPABASE_URL')!;
const ADMIN = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const PUBLIC = Deno.env.get('SUPABASE_ANON_KEY')!;
const ORIGINS = new Set([
  'https://3b-international.vercel.app',
  'http://localhost:5174',
  'http://127.0.0.1:5174',
]);

Deno.serve(async (req: Request) => {
  const origin = req.headers.get('origin') || '';
  const cors = {
    ...(ORIGINS.has(origin) ? { 'Access-Control-Allow-Origin': origin } : {}),
    'Access-Control-Allow-Headers': 'authorization,apikey,content-type,x-client-info',
    'Access-Control-Allow-Methods': 'POST,OPTIONS',
    'Cache-Control': 'no-store',
    'Vary': 'Origin',
  };
  const reply = (body: unknown, status = 200) =>
    Response.json(body, { status, headers: cors });

  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  if (req.method !== 'POST') return reply({ error: 'Méthode non autorisée.' }, 405);
  if (origin && !ORIGINS.has(origin)) return reply({ error: 'Origine non autorisée.' }, 403);

  const authorization = req.headers.get('authorization') || '';
  if (!authorization.startsWith('Bearer ')) return reply({ error: 'Connecte-toi à ton compte 3B.' }, 401);

  try {
    const userResponse = await fetch(`${BASE}/auth/v1/user`, {
      headers: { apikey: PUBLIC, Authorization: authorization },
      signal: AbortSignal.timeout(10000),
    });
    const user = await userResponse.json().catch(() => null);
    if (!userResponse.ok || !user?.id) return reply({ error: 'Ta session a expiré. Reconnecte-toi.' }, 401);

    const deleteResponse = await fetch(`${BASE}/auth/v1/admin/users/${encodeURIComponent(user.id)}`, {
      method: 'DELETE',
      headers: { apikey: ADMIN, Authorization: `Bearer ${ADMIN}` },
      signal: AbortSignal.timeout(12000),
    });

    if (!deleteResponse.ok) {
      const details = await deleteResponse.json().catch(() => null);
      console.error('3B account deletion failed', deleteResponse.status, details);
      return reply({ error: 'La suppression n’a pas abouti. Réessaie ou contacte 3B International.' }, 409);
    }

    return reply({ ok: true });
  } catch (error) {
    console.error('3B account deletion error', error);
    return reply({ error: 'Service momentanément indisponible. Réessaie dans un instant.' }, 503);
  }
});
