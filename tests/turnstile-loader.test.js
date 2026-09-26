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

test('deployment policy isolates Turnstile and the privacy-enhanced Sport player without relaxing script origins', () => {
  const config = JSON.parse(readFileSync('vercel.json', 'utf8'));
  const cspRules = config.headers
    .map(rule => ({
      source: rule.source,
      header: (rule.headers || []).find(header => header.key === 'Content-Security-Policy'),
    }))
    .filter(rule => rule.header);

  const appRule = cspRules.find(rule => rule.header.value.includes('https://challenges.cloudflare.com'));
  assert.ok(appRule, 'application CSP with Turnstile must exist');
  const appDirectives = new Map(appRule.header.value.split(';').map(value => value.trim().split(/\s+/)).filter(parts => parts[0]).map(([name, ...values]) => [name, values]));
  assert.ok(appDirectives.get('script-src').includes('https://challenges.cloudflare.com'));
  assert.ok(appDirectives.get('frame-src').includes('https://challenges.cloudflare.com'));
  assert.ok(!appDirectives.get('script-src').includes("'unsafe-inline'"));
  assert.ok(!appDirectives.get('script-src').includes('*'));
  assert.deepEqual(appDirectives.get('object-src'), ["'none'"]);

  const sportRule = cspRules.find(rule =>
    rule.source === '/sport-player-shell.html' &&
    rule.header.value.includes('https://www.youtube-nocookie.com')
  );
  assert.ok(sportRule, 'dedicated Sport player CSP with privacy-enhanced YouTube must exist');
  const sportDirectives = new Map(sportRule.header.value.split(';').map(value => value.trim().split(/\s+/)).filter(parts => parts[0]).map(([name, ...values]) => [name, values]));
  assert.deepEqual(sportDirectives.get('frame-src'), ['https://www.youtube-nocookie.com']);
  assert.deepEqual(sportDirectives.get('object-src'), ["'none'"]);
  assert.ok(!sportDirectives.get('script-src').includes('*'));
});
