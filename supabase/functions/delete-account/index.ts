const BASE = Deno.env.get('SUPABASE_URL')!;

function bundledKey(bundleEnv: string, legacyEnv: string) {
  const raw = Deno.env.get(bundleEnv);
  if (raw) try {
    const parsed = JSON.parse(raw);
    if (typeof parsed?.default === 'string' && parsed.default) return parsed.default;
    const first = Object.values(parsed || {}).find(value => typeof value === 'string' && value);
    if (typeof first === 'string') return first;
  } catch {}
  return Deno.env.get(legacyEnv) || '';
}

const ADMIN = bundledKey('SUPABASE_SECRET_KEYS', 'SUPABASE_SERVICE_ROLE_KEY');
const PUBLIC = bundledKey('SUPABASE_PUBLISHABLE_KEYS', 'SUPABASE_ANON_KEY');
const ORIGINS = new Set([
  'https://3b-international.vercel.app',
  'https://localhost',
  'capacitor://localhost',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:5174',
  'http://127.0.0.1:5174',
]);

class Failure extends Error {
  constructor(public status: number, message: string) { super(message); }
}

async function adminApi(path: string, body?: unknown) {
  if (!ADMIN) throw new Failure(503, 'Configuration serveur incomplète.');
  const response = await fetch(BASE + path, {
    method: body === undefined ? 'GET' : 'POST',
    headers: {
      apikey: ADMIN,
      ...(ADMIN.startsWith('sb_secret_') ? {} : { Authorization: 'Bearer ' + ADMIN }),
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    signal: AbortSignal.timeout(10000),
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Failure(response.status >= 500 ? 503 : 400, 'La vérification de sécurité a échoué.');
  return data;
}

function sessionIdFromToken(token: string) {
  try {
    const part = token.split('.')[1];
    if (!part) return '';
    const normalized = part.replace(/-/g, '+').replace(/_/g, '/');
    return String(JSON.parse(atob(normalized)).session_id || '');
  } catch {
    return '';
  }
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get('origin') || '';
  const cors = {
    ...(ORIGINS.has(origin) ? { 'Access-Control-Allow-Origin': origin } : {}),
    'Access-Control-Allow-Headers': 'authorization,apikey,content-type,x-client-info',
    'Access-Control-Allow-Methods': 'POST,OPTIONS',
    'Cache-Control': 'no-store',
    'Vary': 'Origin',
    'X-Content-Type-Options': 'nosniff',
  };
  const reply = (body: unknown, status = 200) =>
    Response.json(body, { status, headers: cors });

  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  if (req.method !== 'POST') return reply({ error: 'Méthode non autorisée.' }, 405);
  if (origin && !ORIGINS.has(origin)) return reply({ error: 'Origine non autorisée.' }, 403);
  if (!PUBLIC) return reply({ error: 'Configuration d’authentification incomplète.' }, 503);

  const authorization = req.headers.get('authorization') || '';
  if (!authorization.startsWith('Bearer ')) return reply({ error: 'Connecte-toi à ton compte 3B.' }, 401);

  try {
    const token = authorization.slice(7);
    const userResponse = await fetch(`${BASE}/auth/v1/user`, {
      headers: { apikey: PUBLIC, Authorization: authorization },
      signal: AbortSignal.timeout(10000),
    });
    const user = await userResponse.json().catch(() => null);
    if (!userResponse.ok || !user?.id) throw new Failure(401, 'Ta session a expiré. Reconnecte-toi.');

    const sid = sessionIdFromToken(token);
    if (!sid) throw new Failure(401, 'Ta session a expiré. Reconnecte-toi.');

    const sessionActive = await adminApi('/rest/v1/rpc/loyalty_session_valid', {
      p_user: user.id,
      p_session: sid,
    });
    if (sessionActive !== true) throw new Failure(401, 'Ta session a expiré. Reconnecte-toi.');

    const allowed = await adminApi('/rest/v1/rpc/loyalty_rate', {
      p_key: user.id + ':delete-account',
      p_limit: 3,
      p_window: 3600,
    });
    if (allowed !== true) throw new Failure(429, 'Trop de tentatives. Réessaie plus tard.');

    if (!ADMIN) throw new Failure(503, 'Configuration serveur incomplète.');
    const deleteResponse = await fetch(`${BASE}/auth/v1/admin/users/${encodeURIComponent(user.id)}`, {
      method: 'DELETE',
      headers: {
        apikey: ADMIN,
        ...(ADMIN.startsWith('sb_secret_') ? {} : { Authorization: `Bearer ${ADMIN}` }),
      },
      signal: AbortSignal.timeout(12000),
    });

    if (!deleteResponse.ok) {
      const details = await deleteResponse.json().catch(() => null);
      console.error('3B account deletion failed', deleteResponse.status, details);
      throw new Failure(409, 'La suppression n’a pas abouti. Réessaie ou contacte 3B International.');
    }

    return reply({ ok: true });
  } catch (error) {
    if (error instanceof Failure) return reply({ error: error.message }, error.status);
    console.error('3B account deletion error', error);
    return reply({ error: 'Service momentanément indisponible. Réessaie dans un instant.' }, 503);
  }
});
