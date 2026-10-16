import test from 'node:test';
import assert from 'node:assert/strict';
import {validFoodBarcode} from '../src/health/foodBarcode.js';
import {MEMBER_SPACES, COUNTRY_INDEX, ADMIN_GUIDES, CINEMA_GUIDES, FINANCE_GUIDES, countryEventsHref,countryNewsHref,countryFor,contactHref} from '../src/member/memberSources.js';
import {fetchFoodProduct} from '../server/food-product.js';
import {fetchMemberBrief} from '../server/member-brief.js';
import catalog from '../api/catalog.js';
import foodApi from '../api/food-product.js';
import pwaAuditRoute from '../server/pwa-audit-route.js';
import {readFileSync} from 'node:fs';

test('member destinations are unique and can be explored without duplicated loyalty data',()=>{
  assert.equal(MEMBER_SPACES.length,10);
  assert.equal(new Set(MEMBER_SPACES.map(x=>x.id)).size,10);
  assert.ok(MEMBER_SPACES.some(x=>x.id==='loyalty'));
  assert.equal(new Set(COUNTRY_INDEX.map(x=>x[0])).size,COUNTRY_INDEX.length);
  assert.ok(COUNTRY_INDEX.length>=30);
});
test('all member external editorial source links use https',()=>{
  for(const row of COUNTRY_INDEX)assert.equal(new URL(row[4]).protocol,'https:',row[1]);
  for(const source of [...ADMIN_GUIDES,...CINEMA_GUIDES,...FINANCE_GUIDES])assert.equal(new URL(source.href).protocol,'https:',source.title);
  assert.equal(new URL(countryNewsHref('FR')).hostname,'news.google.com');
  assert.equal(new URL(countryEventsHref('FR')).hostname,'openagenda.com');
  assert.equal(countryFor('NOT-FOUND')[0],'FR');
  assert.match(contactHref('proposer une idée'),/^mailto:3bblackblancbeurr@gmail.com\?subject=/);
});
test('scanner validates common GTIN-13 check digits',()=>{
  assert.equal(validFoodBarcode('3017620422003'),true);
  assert.equal(validFoodBarcode('3017620422004'),false);
  assert.equal(validFoodBarcode('abc'),false);
  assert.equal(validFoodBarcode(''),false);
  assert.equal(validFoodBarcode('123456789012345'),false);
});

test('food lookup rejects invalid routes and unsafe barcodes without network access',async()=>{
  const badMethod=await fetchFoodProduct(new Request('https://3b.example/api/food-product?code=3017620422003',{method:'POST'}));
  const invalid=await fetchFoodProduct(new Request('https://3b.example/api/food-product?code=https://example.com/'));
  assert.equal(badMethod.status,405);
  assert.equal(invalid.status,400);
  assert.equal((await invalid.json()).error,'Code-barres invalide');
  assert.equal(invalid.headers.get('x-content-type-options'),'nosniff');
});
test('world news is restricted to two allowlisted feeds',async()=>{
  const badMethod=await fetchMemberBrief(new Request('https://3b.example/api/member-brief?feed=world',{method:'POST'}));
  const invalid=await fetchMemberBrief(new Request('https://3b.example/api/member-brief?feed=https://example.com'));
  assert.equal(badMethod.status,405);
  assert.equal(invalid.status,400);
  assert.equal(invalid.headers.get('x-content-type-options'),'nosniff');
});
test('member services share the original Vercel catalog router and do not require paid functions',()=>{
  const config=JSON.parse(readFileSync(new URL('../vercel.json',import.meta.url),'utf8'));
  const items=['member-brief','pwa-audit'];
  for(const id of items){
    assert.ok(config.rewrites.some(x=>x.source==='/api/'+id&&x.destination==='/api/catalog?__3b_route='+id));
  }
  assert.equal(typeof catalog.fetch,'function');
  assert.equal(typeof foodApi.fetch,'function');
  assert.equal(typeof pwaAuditRoute.fetch,'function');
  assert.ok(!config.rewrites.some(x=>x.source==='/api/food-product'));
});
