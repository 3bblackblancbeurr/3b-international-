import { auditPwa } from '../server/pwa-audit.js';
import { consumePwaQuickKitRateLimit } from '../server/pwa-quickkit-rate-limit.js';

function json(data, status = 200, extra = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff',
      ...extra,
    },
  });
}

export default {
  fetch: async request => {
    if (request.method !== 'GET') return json({ error: 'Méthode non autorisée.' }, 405, { Allow: 'GET' });
    try {
      const rate = await consumePwaQuickKitRateLimit(request);
      if (rate.unavailable) return json({ error: 'Protection anti-abus temporairement indisponible.' }, 503, { 'Retry-After': '60' });
      if (!rate.allowed) return json({ error: 'Limite gratuite atteinte. Réessaie demain.' }, 429, { 'Retry-After': '3600' });

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
