import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');

test('sitemap is clean, unique and contains the canonical 3B app landing page', () => {
  const sitemap = read('public/sitemap.xml');
  assert.doesNotMatch(sitemap, /\\n/);
  assert.match(sitemap, /<urlset xmlns="http:\/\/www\.sitemaps\.org\/schemas\/sitemap\/0\.9">/);
  const urls = [...sitemap.matchAll(/<loc>(https:\/\/[^<]+)<\/loc>/g)].map(match => match[1]);
  assert.ok(urls.includes('https://3b-international.vercel.app/application-3b-international.html'));
  assert.ok(urls.includes('https://3b-international.vercel.app/install-iphone.html'));
  assert.ok(urls.includes('https://3b-international.vercel.app/install-android.html'));
  assert.equal(new Set(urls).size, urls.length);
});

test('robots exposes the sitemap and the app landing page is indexable', () => {
  const robots = read('public/robots.txt');
  const page = read('public/application-3b-international.html');
  assert.match(robots, /Sitemap: https:\/\/3b-international\.vercel\.app\/sitemap\.xml/);
  assert.match(page, /index,follow/);
  assert.match(page, /Application 3B International/);
  assert.match(page, /Télécharger \/ installer 3B/);
  assert.match(page, /Black Blanc Beur/);
  assert.match(page, /SoftwareApplication/);
  assert.match(page, /WebApplication/);
  assert.match(page, /"price":0/);
});

test('home points search engines and users to the app landing and installer', () => {
  const home = read('index.html');
  assert.match(home, /application-3b-international\.html/);
  assert.match(home, /"installUrl":"https:\/\/3b-international\.vercel\.app\/installer"/);
  assert.match(home, /"operatingSystem":"Web, iOS, iPadOS, Android"/);
});

test('IndexNow automation verifies ownership and submits sitemap URLs', () => {
  const workflow = read('.github/workflows/indexnow.yml');
  const script = read('scripts/submit-indexnow.mjs');
  const key = '3b-indexnow-20260922-a7f42c8d10e65b91';
  assert.equal(read('public/' + key + '.txt').trim(), key);
  assert.match(workflow, /schedule:/);
  assert.match(workflow, /push:/);
  assert.match(script, /api\.indexnow\.org\/indexnow/);
  assert.match(script, /sitemap\.xml/);
  assert.match(script, /keyLocation/);
});
