#!/usr/bin/env node

const command = process.argv[2] || 'health';
const rawBase = process.env.THREEB_UNREAL_REMOTE_URL || 'http://127.0.0.1:30010';

function fail(message) {
  console.error(JSON.stringify({ ok: false, error: message }, null, 2));
  process.exitCode = 1;
}

function validatedBase(raw) {
  const url = new URL(raw);
  const allowedHosts = new Set(['127.0.0.1', 'localhost', '[::1]']);
  if (url.protocol !== 'http:') throw new Error('Le bridge Unreal 3B exige HTTP local.');
  if (!allowedHosts.has(url.hostname)) {
    throw new Error('Refus de contacter un serveur Unreal non local. Utilise 127.0.0.1/localhost uniquement.');
  }
  url.pathname = '';
  url.search = '';
  url.hash = '';
  return url.toString().replace(/\/$/, '');
}

async function request(base, path, { method = 'GET', body } = {}) {
  const response = await fetch(base + path, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(5000),
  });
  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  if (!response.ok) {
    throw new Error('Unreal Remote Control HTTP ' + response.status + ': ' + String(text).slice(0, 500));
  }
  return data;
}

function countRoutes(info) {
  if (Array.isArray(info)) return info.length;
  if (Array.isArray(info?.Routes)) return info.Routes.length;
  if (Array.isArray(info?.routes)) return info.routes.length;
  if (info && typeof info === 'object') return Object.keys(info).length;
  return 0;
}

async function health(base) {
  const info = await request(base, '/remote/info');
  return {
    ok: true,
    bridge: '3B Unreal Editor Bridge',
    mode: 'read-only-v1',
    remote_url: base,
    route_count: countRoutes(info),
  };
}

async function actors(base) {
  const result = await request(base, '/remote/object/call', {
    method: 'PUT',
    body: {
      objectPath: '/Script/EditorScriptingUtilities.Default__EditorLevelLibrary',
      functionName: 'GetAllLevelActors',
    },
  });
  const list = Array.isArray(result?.ReturnValue) ? result.ReturnValue : [];
  return {
    ok: true,
    actor_count: list.length,
    actors: list,
  };
}

async function main() {
  const base = validatedBase(rawBase);
  if (command === 'health') {
    console.log(JSON.stringify(await health(base), null, 2));
    return;
  }
  if (command === 'actors') {
    console.log(JSON.stringify(await actors(base), null, 2));
    return;
  }
  if (command === 'snapshot') {
    const [healthResult, actorResult] = await Promise.all([health(base), actors(base)]);
    console.log(JSON.stringify({
      ok: true,
      captured_at: new Date().toISOString(),
      health: healthResult,
      level: actorResult,
    }, null, 2));
    return;
  }
  throw new Error('Commande non autorisée. Utilise: health, actors ou snapshot.');
}

main().catch((error) => fail(error instanceof Error ? error.message : String(error)));
