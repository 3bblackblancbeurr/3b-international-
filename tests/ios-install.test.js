import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');

test('iPhone install surface keeps Apple web-app instructions and required PWA metadata', () => {
  const page = read('public/install-iphone.html');
  const root = read('index.html');
  const manifest = JSON.parse(read('public/manifest.webmanifest'));
  assert.match(page, /Sur l’écran d’accueil/);
  assert.match(page, /Ouvrir comme app web/);
  assert.match(page, /apple-mobile-web-app-capable/);
  assert.match(page, /apple-touch-icon/);
  assert.match(root, /apple-mobile-web-app-capable/);
  assert.equal(manifest.display, 'standalone');
  assert.equal(manifest.start_url, '/');
  assert.equal(manifest.scope, '/');
});

test('iPhone install works without email invitation and exposes a future native distribution registry', () => {
  const page = read('public/install-iphone.html');
  const script = read('public/install-iphone.js');
  const config = JSON.parse(read('public/ios-distribution.json'));
  assert.match(page, /Sans invitation/);
  assert.match(script, /ios-distribution\.json/);
  assert.match(script, /TestFlight public/);
  assert.equal(typeof config.testflightUrl, 'string');
  assert.equal(typeof config.appStoreUrl, 'string');
  assert.equal(typeof config.webDistributionUrl, 'string');
});

test('short public install aliases are deployed and social browsers receive Safari guidance', () => {
  const vercel = JSON.parse(read('vercel.json'));
  const script = read('public/install-iphone.js');
  const aliases = new Map((vercel.redirects || []).map(item => [item.source, item.destination]));
  assert.equal(aliases.get('/iphone'), '/install-iphone.html');
  assert.equal(aliases.get('/ios'), '/install-iphone.html');
  assert.equal(aliases.get('/installer'), '/install.html');
  assert.match(script, /Instagram/);
  assert.match(script, /TikTok/);
  assert.match(script, /Ouvrir dans Safari/);
});
