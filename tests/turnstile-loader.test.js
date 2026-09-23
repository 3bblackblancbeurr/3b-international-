import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createTurnstileLoader} from '../src/loyalty/turnstile-loader.js';

function fixture() {
  const scripts = [];
  const timers = new Map();
  let next = 0;
  const window = {
    setTimeout(fn) { timers.set(++next, fn); return next; },
    clearTimeout(id) { timers.delete(id); },
  };
  const document = {
    getElementById(id) { return scripts.find(script => script.id === id); },
    createElement() {
      const script = new EventTarget();
      script.remove = () => { const index = scripts.indexOf(script); if (index >= 0) scripts.splice(index, 1); };
      return script;
    },
    head: { appendChild(script) { scripts.push(script); } },
  };
  return {window, document, scripts, timers, load: createTurnstileLoader({window, document})};
}

test('concurrent forms share one script and resolve to the same API', async () => {
  const f = fixture();
  const first = f.load(), second = f.load();
  assert.equal(first, second);
  assert.equal(f.scripts.length, 1);
  f.window.turnstile = {render() {}};
  f.scripts[0].dispatchEvent(new Event('load'));
  assert.equal(await first, f.window.turnstile);
  assert.equal(await f.load(), f.window.turnstile);
  assert.equal(f.timers.size, 0);
});

test('a network failure removes the failed script so the next attempt can succeed', async () => {
  const f = fixture();
  const first = f.load();
  f.scripts[0].dispatchEvent(new Event('error'));
  await assert.rejects(first, /indisponible/);
  assert.equal(f.scripts.length, 0);
  const retry = f.load();
  f.window.turnstile = {};
  f.scripts[0].dispatchEvent(new Event('load'));
  assert.equal(await retry, f.window.turnstile);
});

test('a blocked script cannot leave the form waiting forever', async () => {
  const f = fixture();
  const request = f.load();
  for (const timer of [...f.timers.values()]) timer();
  await assert.rejects(request, /indisponible/);
  assert.equal(f.scripts.length, 0);
  assert.equal(f.timers.size, 0);
});

test('a script that loaded without the API rejects and can be retried', async () => {
  const f = fixture();
  const request = f.load();
  f.scripts[0].dispatchEvent(new Event('load'));
  await assert.rejects(request, /indisponible/);
  assert.equal(f.scripts.length, 0);
});

test('deployment policy allows the anti-bot script and frame without relaxing other script origins', () => {
  const config = JSON.parse(readFileSync('vercel.json', 'utf8'));
  const policy = config.headers.find(rule => rule.source === '/(.*)').headers.find(header => header.key === 'Content-Security-Policy').value;
  const directives = new Map(policy.split(';').map(value => value.trim().split(/\s+/)).filter(parts => parts[0]).map(([name, ...values]) => [name, values]));
  assert.ok(directives.get('script-src').includes('https://challenges.cloudflare.com'));
  assert.deepEqual(directives.get('frame-src'), ['https://challenges.cloudflare.com']);
  assert.ok(!directives.get('script-src').includes("'unsafe-inline'"));
  assert.ok(!directives.get('script-src').includes('*'));
  assert.deepEqual(directives.get('object-src'), ["'none'"]);
});
