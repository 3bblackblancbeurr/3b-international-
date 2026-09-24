import test from 'node:test';
import assert from 'node:assert/strict';
import { createRevenueFunnel } from '../server/revenue-funnel.js';

const env = {
  SUPABASE_URL: 'https://example.supabase.co',
  SUPABASE_SERVICE_ROLE_KEY: 'server-secret',
};

test('revenue funnel rejects cross-origin writes', async () => {
  const handler = createRevenueFunnel({ env, fetcher: async () => { throw new Error('must not fetch'); } });
  const response = await handler(new Request('https://site.example/api/revenue-event', {
    method: 'POST',
    headers: { origin: 'https://attacker.invalid', 'content-type': 'application/json' },
    body: JSON.stringify({ event: 'tools_page_view', sessionId: crypto.randomUUID(), page: '/outils-ia/' }),
  }));
  assert.equal(response.status, 403);
});

test('revenue funnel rejects unknown event names', async () => {
  const handler = createRevenueFunnel({ env, fetcher: async () => { throw new Error('must not fetch'); } });
  const response = await handler(new Request('https://site.example/api/revenue-event', {
    method: 'POST',
    headers: { origin: 'https://site.example', 'content-type': 'application/json' },
    body: JSON.stringify({ event: 'arbitrary_event', sessionId: crypto.randomUUID(), page: '/x' }),
  }));
  assert.equal(response.status, 400);
});

test('revenue funnel stores only whitelisted metadata', async () => {
  let stored = null;
  const handler = createRevenueFunnel({
    env,
    fetcher: async (url, options) => {
      stored = JSON.parse(options.body);
      return new Response('', { status: 201 });
    },
  });
  const response = await handler(new Request('https://site.example/api/revenue-event', {
    method: 'POST',
    headers: { origin: 'https://site.example', 'content-type': 'application/json' },
    body: JSON.stringify({
      event: 'quickkit_audit_completed',
      sessionId: crypto.randomUUID(),
      page: '/pwa-quickkit/',
      channel: 'github',
      metadata: { score: 88, grade: 'B', email: 'should-not-be-stored@example.com', tool: 'quickkit' },
    }),
  }));
  assert.equal(response.status, 202);
  assert.deepEqual(stored.metadata, { score: 88, grade: 'B', tool: 'quickkit' });
  assert.equal(stored.channel, 'github');
});
