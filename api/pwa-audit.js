import { auditPwa } from '../server/pwa-audit.js';

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff',
    },
  });
}

export default {
  fetch: async request => {
    if (request.method !== 'GET') return json({ error: 'Méthode non autorisée.' }, 405);
    try {
      const url = new URL(request.url);
      const target = url.searchParams.get('url');
      if (!target) return json({ error: 'Paramètre url requis.' }, 400);
      const result = await auditPwa(target);
      return json(result);
    } catch (error) {
      const message = error?.name === 'AbortError' ? 'Le site met trop de temps à répondre.' : (error?.message || 'Audit impossible.');
      return json({ error: message }, 400);
    }
  },
};
