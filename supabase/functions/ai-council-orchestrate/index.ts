const BASE = Deno.env.get('SUPABASE_URL') || '';

class Failure extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

type ProviderConfig = {
  provider: string;
  display_name: string;
  enabled: boolean;
  role_hint: string;
  model_env: string;
  secret_env: string;
};

type ProviderResult = {
  provider: string;
  model: string;
  role: string;
  status: 'succeeded' | 'failed' | 'skipped';
  output: string;
  usage: Record<string, unknown>;
  latency_ms: number;
  error_code?: string;
  error_message?: string;
};

function bundledKey(bundleEnv: string, legacyEnv: string) {
  const raw = Deno.env.get(bundleEnv);
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (typeof parsed?.default === 'string' && parsed.default) return parsed.default;
      const first = Object.values(parsed || {}).find((value) => typeof value === 'string' && value);
      if (typeof first === 'string') return first;
    } catch {
      // Fall back to the legacy variable below.
    }
  }
  return Deno.env.get(legacyEnv) || '';
}

const ADMIN = bundledKey('SUPABASE_SECRET_KEYS', 'SUPABASE_SERVICE_ROLE_KEY');
const PUBLIC_KEY = bundledKey('SUPABASE_PUBLISHABLE_KEYS', 'SUPABASE_ANON_KEY');

function adminHeaders(body = false) {
  if (!ADMIN) throw new Failure(503, 'Clé serveur Supabase absente.');
  return {
    apikey: ADMIN,
    ...(ADMIN.startsWith('sb_secret_') ? {} : { Authorization: 'Bearer ' + ADMIN }),
    ...(body ? { 'Content-Type': 'application/json', Prefer: 'return=representation' } : {}),
  };
}

async function adminApi(path: string, init: RequestInit = {}) {
  const hasBody = init.body !== undefined;
  const response = await fetch(BASE + path, {
    ...init,
    headers: { ...adminHeaders(hasBody), ...(init.headers || {}) },
    signal: init.signal || AbortSignal.timeout(12000),
  });
  const text = await response.text();
  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }
  if (!response.ok) {
    throw new Failure(response.status >= 500 ? 503 : 400, 'Stockage Conseil IA indisponible.');
  }
  return data;
}

async function authenticateOwner(req: Request) {
  if (Deno.env.get('AI_COUNCIL_ENABLED') !== 'true') {
    throw new Failure(503, 'Conseil IA désactivé.');
  }
  const ownerId = Deno.env.get('AI_COUNCIL_OWNER_USER_ID') || '';
  if (!ownerId) throw new Failure(503, 'Propriétaire du Conseil IA non configuré.');

  const auth = req.headers.get('authorization') || '';
  if (!auth.startsWith('Bearer ')) throw new Failure(401, 'Authentification requise.');
  if (!PUBLIC_KEY) throw new Failure(503, 'Clé publique Supabase absente.');

  const response = await fetch(BASE + '/auth/v1/user', {
    headers: { apikey: PUBLIC_KEY, Authorization: auth },
    signal: AbortSignal.timeout(10000),
  });
  const user = await response.json().catch(() => null);
  if (!response.ok || !user?.id) throw new Failure(401, 'Session invalide.');
  if (user.id !== ownerId) throw new Failure(403, 'Accès Conseil IA refusé.');
  return user.id as string;
}

async function sha256(value: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function safeText(value: unknown, max = 60000) {
  return typeof value === 'string' ? value.slice(0, max) : '';
}

function providerPrompt(objective: string, context: unknown, role: string) {
  const contextText = JSON.stringify(context ?? {}).slice(0, 30000);
  return [
    'You are an independent member of the 3B AI Council.',
    'Role: ' + role + '.',
    'Analyze the request independently. Do not claim to execute tools, code, GitHub changes, database writes, or Unreal actions.',
    'Identify uncertainties, contradictions, security risks, and tests that should be run.',
    'Return: analysis, recommended approach, risks, verification steps, and unresolved questions.',
    '',
    'OBJECTIVE:',
    objective,
    '',
    'CONTEXT JSON:',
    contextText,
  ].join('\n');
}

async function providerFetch(url: string, init: RequestInit) {
  const response = await fetch(url, { ...init, signal: AbortSignal.timeout(40000) });
  const text = await response.text();
  let json: any = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }
  if (!response.ok) {
    const message = safeText(json?.error?.message || json?.message || text || 'Provider error', 700);
    throw new Failure(502, message);
  }
  return json;
}

async function callOpenAI(model: string, key: string, prompt: string): Promise<{ text: string; usage: Record<string, unknown> }> {
  const json = await providerFetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      input: prompt,
      max_output_tokens: 1800,
    }),
  });
  const direct = safeText(json?.output_text);
  const parts = Array.isArray(json?.output)
    ? json.output.flatMap((item: any) => Array.isArray(item?.content) ? item.content : [])
      .map((part: any) => safeText(part?.text || part?.value))
      .filter(Boolean)
    : [];
  return { text: (direct || parts.join('\n')).slice(0, 60000), usage: json?.usage || {} };
}

async function callAnthropic(model: string, key: string, prompt: string): Promise<{ text: string; usage: Record<string, unknown> }> {
  const json = await providerFetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      max_tokens: 1800,
      messages: [{ role: 'user', content: prompt }],
    }),
  });
  const parts = Array.isArray(json?.content)
    ? json.content.map((part: any) => part?.type === 'text' ? safeText(part?.text) : '').filter(Boolean)
    : [];
  return { text: parts.join('\n').slice(0, 60000), usage: json?.usage || {} };
}

async function callGemini(model: string, key: string, prompt: string): Promise<{ text: string; usage: Record<string, unknown> }> {
  const cleanModel = model.replace(/^models\//, '');
  const json = await providerFetch(
    'https://generativelanguage.googleapis.com/v1beta/models/' + encodeURIComponent(cleanModel) + ':generateContent',
    {
      method: 'POST',
      headers: { 'x-goog-api-key': key, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
      }),
    },
  );
  const parts = Array.isArray(json?.candidates)
    ? json.candidates.flatMap((candidate: any) => candidate?.content?.parts || [])
      .map((part: any) => safeText(part?.text))
      .filter(Boolean)
    : [];
  return { text: parts.join('\n').slice(0, 60000), usage: json?.usageMetadata || {} };
}

async function runProvider(config: ProviderConfig, objective: string, context: unknown): Promise<ProviderResult> {
  const started = Date.now();
  const model = Deno.env.get(config.model_env) || '';
  const key = Deno.env.get(config.secret_env) || '';
  if (!config.enabled || !model || !key) {
    return {
      provider: config.provider,
      model,
      role: config.role_hint,
      status: 'skipped',
      output: '',
      usage: {},
      latency_ms: Date.now() - started,
      error_code: 'not_configured',
      error_message: 'Provider désactivé ou secret/modèle absent.',
    };
  }

  const prompt = providerPrompt(objective, context, config.role_hint);
  try {
    let result: { text: string; usage: Record<string, unknown> };
    if (config.provider === 'openai') result = await callOpenAI(model, key, prompt);
    else if (config.provider === 'anthropic') result = await callAnthropic(model, key, prompt);
    else if (config.provider === 'gemini') result = await callGemini(model, key, prompt);
    else {
      return {
        provider: config.provider,
        model,
        role: config.role_hint,
        status: 'skipped',
        output: '',
        usage: {},
        latency_ms: Date.now() - started,
        error_code: 'unsupported_provider',
        error_message: 'Provider non pris en charge.',
      };
    }
    if (!result.text) throw new Error('Réponse vide.');
    return {
      provider: config.provider,
      model,
      role: config.role_hint,
      status: 'succeeded',
      output: result.text,
      usage: result.usage,
      latency_ms: Date.now() - started,
    };
  } catch (error) {
    return {
      provider: config.provider,
      model,
      role: config.role_hint,
      status: 'failed',
      output: '',
      usage: {},
      latency_ms: Date.now() - started,
      error_code: 'provider_error',
      error_message: safeText(error instanceof Error ? error.message : String(error), 700),
    };
  }
}

Deno.serve(async (req: Request) => {
  const reply = (body: unknown, status = 200) =>
    Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });

  if (req.method !== 'POST') return reply({ error: 'Méthode non autorisée.' }, 405);

  try {
    const uid = await authenticateOwner(req);
    const raw = await req.text();
    if (raw.length > 65536) throw new Failure(413, 'Demande trop volumineuse.');
    const body = raw ? JSON.parse(raw) : {};

    const registry = await adminApi('/rest/v1/ai_council_provider_registry?select=provider,display_name,enabled,role_hint,model_env,secret_env&order=provider.asc') as ProviderConfig[];

    if (body?.action === 'health') {
      return reply({
        ok: true,
        enabled: true,
        providers: (registry || []).map((p) => ({
          provider: p.provider,
          enabled: !!p.enabled,
          model_configured: !!Deno.env.get(p.model_env),
          secret_configured: !!Deno.env.get(p.secret_env),
        })),
      });
    }

    const objective = safeText(body?.objective, 20000).trim();
    if (!objective) throw new Failure(400, 'Objectif manquant.');
    const context = body?.context && typeof body.context === 'object' ? body.context : {};
    const requested = Array.isArray(body?.providers)
      ? body.providers.filter((p: unknown) => typeof p === 'string' && ['openai', 'anthropic', 'gemini'].includes(p as string))
      : ['openai', 'anthropic', 'gemini'];
    const configs = (registry || []).filter((p) => requested.includes(p.provider));
    const quorum = Math.max(1, Math.min(Number(body?.provider_quorum || 2), Math.max(1, configs.length)));

    const rate = await adminApi('/rest/v1/rpc/loyalty_rate', {
      method: 'POST',
      body: JSON.stringify({ p_key: uid + ':ai-council', p_limit: 8, p_window: 60 }),
    });
    if (rate !== true) throw new Failure(429, 'Trop de demandes Conseil IA.');

    const inserted = await adminApi('/rest/v1/ai_council_tasks', {
      method: 'POST',
      body: JSON.stringify({
        created_by: uid,
        source: 'ai-council-edge',
        objective,
        context,
        target: safeText(body?.target, 80) || 'general',
        risk_level: ['normal', 'elevated', 'critical'].includes(body?.risk_level) ? body.risk_level : 'normal',
        status: 'running',
        required_providers: requested,
        provider_quorum: quorum,
        github_repo: safeText(body?.github_repo, 180) || null,
        github_ref: safeText(body?.github_ref, 180) || null,
        metadata: body?.metadata && typeof body.metadata === 'object' ? body.metadata : {},
      }),
    }) as any[];

    const task = inserted?.[0];
    if (!task?.id) throw new Failure(503, 'Impossible de créer la tâche Conseil IA.');

    await adminApi('/rest/v1/ai_council_events', {
      method: 'POST',
      body: JSON.stringify({
        task_id: task.id,
        event_type: 'task.started',
        actor: 'orchestrator',
        payload: { providers: requested, quorum },
      }),
    });

    const results = await Promise.all(configs.map((config) => runProvider(config, objective, context)));
    const promptDigest = await sha256(providerPrompt(objective, context, 'independent'));

    if (results.length) {
      await adminApi('/rest/v1/ai_council_runs', {
        method: 'POST',
        body: JSON.stringify(results.map((result) => ({
          task_id: task.id,
          provider: result.provider,
          model: result.model || 'unconfigured',
          role: result.role,
          status: result.status,
          prompt_digest: promptDigest,
          output_text: result.output || null,
          usage: result.usage,
          latency_ms: result.latency_ms,
          error_code: result.error_code || null,
          error_message: result.error_message || null,
          finished_at: new Date().toISOString(),
        }))),
      });
    }

    const succeeded = results.filter((result) => result.status === 'succeeded');
    const activeAttempted = results.filter((result) => result.status !== 'skipped');
    const nextStatus = succeeded.length >= quorum
      ? 'review'
      : activeAttempted.length === 0
      ? 'queued'
      : 'failed';

    await adminApi('/rest/v1/ai_council_tasks?id=eq.' + encodeURIComponent(task.id), {
      method: 'PATCH',
      body: JSON.stringify({ status: nextStatus, updated_at: new Date().toISOString() }),
    });

    await adminApi('/rest/v1/ai_council_decisions', {
      method: 'POST',
      body: JSON.stringify({
        task_id: task.id,
        status: 'draft',
        consensus: {
          quorum,
          successful: succeeded.length,
          attempted: activeAttempted.length,
          requested,
        },
        disagreements: [],
        approval_required: true,
      }),
    });

    await adminApi('/rest/v1/ai_council_events', {
      method: 'POST',
      body: JSON.stringify({
        task_id: task.id,
        event_type: 'task.completed',
        actor: 'orchestrator',
        payload: {
          status: nextStatus,
          successful_providers: succeeded.map((result) => result.provider),
          failed_providers: results.filter((result) => result.status === 'failed').map((result) => result.provider),
          skipped_providers: results.filter((result) => result.status === 'skipped').map((result) => result.provider),
        },
      }),
    });

    return reply({
      task_id: task.id,
      status: nextStatus,
      quorum,
      successful_providers: succeeded.map((result) => result.provider),
      results: results.map((result) => ({
        provider: result.provider,
        model: result.model,
        role: result.role,
        status: result.status,
        output: result.output,
        error: result.error_message || null,
        latency_ms: result.latency_ms,
      })),
      approval_required: true,
    }, nextStatus === 'queued' ? 202 : 200);
  } catch (error) {
    if (error instanceof SyntaxError) return reply({ error: 'JSON invalide.' }, 400);
    const status = error instanceof Failure ? error.status : 503;
    const message = error instanceof Failure
      ? error.message
      : 'Conseil IA momentanément indisponible.';
    return reply({ error: message }, status);
  }
});
