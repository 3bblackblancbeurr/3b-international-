import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const page = readFileSync(new URL('../public/logiciels-3b.html', import.meta.url), 'utf8');
const home = readFileSync(new URL('../src/components/HomePage.jsx', import.meta.url), 'utf8');
const sitemap = readFileSync(new URL('../public/sitemap.xml', import.meta.url), 'utf8');
const origin = 'https://3b-international.vercel.app';
const hrefs = [...page.matchAll(/href="([^"]+)"/g)].map(match => match[1].replaceAll('&amp;', '&'));

test('software page is French, crawlable and canonical', () => {
  assert.match(page, /<html lang="fr">/);
  assert.match(page, /name="robots" content="index,follow"/);
  assert.match(page, /rel="canonical" href="https:\/\/3b-international\.vercel\.app\/logiciels-3b\.html"/);
  assert.equal((page.match(/<h1(?:\s|>)/g) || []).length, 1);
  assert.match(page, /<title>Logiciels 3B/);
  assert.match(page, /name="description" content="[^"]{80,}"/);
});

test('product calls to action use only the two verified public Payhip product IDs', () => {
  const products = hrefs.map(href => new URL(href, origin)).filter(url => url.hostname === 'payhip.com' && url.pathname.startsWith('/b/'));
  assert.equal(products.length, 2);
  assert.deepEqual(products.map(url => url.pathname).sort(), ['/b/JMvm2', '/b/b4CSF']);
  for (const url of products) {
    assert.equal(url.searchParams.get('utm_source'), '3b_website');
    assert.equal(url.searchParams.get('utm_medium'), 'referral');
    assert.equal(url.searchParams.get('utm_campaign'), 'logiciels_3b');
    assert.ok(url.searchParams.get('utm_content'));
  }
});

test('all links are same-site anchors or the approved Payhip storefront', () => {
  for (const href of hrefs) {
    const url = new URL(href, origin);
    assert.equal(url.protocol, 'https:');
    assert.ok(['3b-international.vercel.app', 'payhip.com'].includes(url.hostname));
    if (url.hostname === 'payhip.com') {
      assert.ok(['/3binternational', '/3binternational/contact', '/b/JMvm2', '/b/b4CSF'].includes(url.pathname));
    }
  }
});

test('page has no scripts, checkout form, pixels or storage-dependent gate', () => {
  assert.doesNotMatch(page, /<(?:script|iframe|form)\b/i);
  assert.doesNotMatch(page, /localStorage|sessionStorage|document\.cookie|fbq\(|gtag\(/);
  assert.match(page, /Consultation sans Passeport 3B/);
  assert.match(page, /ne déclenchent aucun achat automatique/);
});

test('product pricing is dated and does not promise revenue', () => {
  assert.match(page, /19,90 €/);
  assert.match(page, /19,00 €/);
  assert.match(page, /11 octobre 2026/);
  assert.match(page, /prix en vigueur/);
  assert.match(page, /pas une garantie de gains/);
});

test('page includes keyboard navigation, FAQ and product image alternatives', () => {
  assert.match(page, /class="skip" href="#contenu"/);
  assert.match(page, /<main id="contenu"/);
  assert.match(page, /:focus-visible/);
  assert.equal((page.match(/<details>/g) || []).length, 5);
  for (const image of page.matchAll(/<img\b[^>]*>/g)) {
    assert.match(image[0], /alt="[^"]+"/);
    assert.match(image[0], /loading="lazy"/);
    assert.match(image[0], /width="\d+"/);
    assert.match(image[0], /height="\d+"/);
  }
});

test('application entry and sitemap expose the software page without opening the textile shop', () => {
  const nav=readFileSync(new URL('../src/components/AppNavigation.jsx',import.meta.url),'utf8');
  assert.match(home,/ImmersiveWorldHome/);
  assert.match(nav,/href="\/logiciels-3b\.html">Logiciels 3B/);
  assert.equal((sitemap.match(/<loc>https:\/\/3b-international\.vercel\.app\/logiciels-3b\.html<\/loc>/g) || []).length, 1);
  assert.doesNotMatch(home, /SHOP_ENABLED\s*=|SHOP_LIVE_APPROVED\s*=/);
});
