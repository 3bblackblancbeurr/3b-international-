import test from 'node:test';
import assert from 'node:assert/strict';
import {validFoodBarcode} from '../src/health/foodBarcode.js';
import {allergenLabel} from '../src/health/allergenLabels.js';
import {MEMBER_SPACES, COUNTRY_INDEX, ADMIN_GUIDES, CINEMA_GUIDES, FINANCE_GUIDES, countryEventsHref,countryNewsHref,countryFor,contactHref} from '../src/member/memberSources.js';
import {fetchFoodProduct} from '../server/food-product.js';
import {fetchMemberBrief} from '../server/member-brief.js';
import catalog from '../api/catalog.js';
import foodApi from '../api/food-product.js';
import pwaAuditRoute from '../server/pwa-audit-route.js';
import pwaStatus from '../api/pwa-quickkit-status.js';
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
  assert.equal(validFoodBarcode('12345678901'),false);
  assert.equal(validFoodBarcode(''),false);
  assert.equal(validFoodBarcode('123456789012345'),false);
});

test('food allergen terms are localized without changing the original taxonomy',()=>{
 assert.equal(allergenLabel('en:milk'),'lait');
 assert.equal(allergenLabel('en:nuts'),'fruits à coque');
 assert.equal(allergenLabel('en:soybeans'),'soja');
 assert.equal(allergenLabel('en:unknown-ingredient'),'unknown ingredient');
});

test('food lookup rejects invalid routes and unsafe barcodes without network access',async()=>{
  const badMethod=await fetchFoodProduct(new Request('https://3b.example/api/food-product?code=3017620422003',{method:'POST'}));
  const invalid=await fetchFoodProduct(new Request('https://3b.example/api/food-product?code=https://example.com/'));
  assert.equal(badMethod.status,405);
  assert.equal(invalid.status,400);
  assert.equal((await fetchFoodProduct(new Request('https://3b.example/api/food-product?code=12345678901'))).status,400);
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

test('France 24 live feed parser accepts an authentic RSS shape and rejects untrusted article links',async()=>{
  const original=globalThis.fetch;
  const date=new Date().toUTCString();
  const xml='<?xml version="1.0"?><rss version="2.0"><channel>'
   +'<item><title>France &amp; Europe</title><link>https://www.france24.com/fr/europe/actualite</link><pubDate>'+date+'</pubDate></item>'
   +'<item><title>Fake external link</title><link>https://phishing.example/evil</link><pubDate>'+date+'</pubDate></item>'
   +'</channel></rss>';
  try {
    globalThis.fetch=async()=>new Response(xml,{status:200,headers:{'content-type':'application/rss+xml'}});
    const reply=await catalog.fetch(new Request('https://3b.example/api/catalog?__3b_route=member-brief&feed=fr'));
    assert.equal(reply.status,200);
    const data=await reply.json();
    assert.equal(data.items.length,1);
    assert.equal(data.items[0].title,'France & Europe');
    assert.equal(data.items[0].source,'France 24');
  } finally {globalThis.fetch=original;}
});


test('food API returns a nutrition card but no personal member data',async()=>{
  const previous=globalThis.fetch;
  try {
    globalThis.fetch=async()=>new Response(JSON.stringify({status:1,product:{
      product_name_fr:'Produit témoin',brands:'3B QA TEST',quantity:'100 g',
      ingredients_text_fr:'lait',allergens_tags:['en:milk'],traces_tags:[],
      nutriments:{'energy-kcal_100g':80,proteins_100g:4,sugars_100g:5}
    }}),{status:200,headers:{'content-type':'application/json'}});
    const reply=await foodApi.fetch(new Request('https://3b.example/api/food-product?code=3017620422003'));
    assert.equal(reply.status,200);
    const data=await reply.json();
    assert.equal(data.product.name,'Produit témoin');
    assert.equal(data.product.per100g.kcal,80);
    assert.ok(data.product.allergens.includes('en:milk'));
    assert.ok(!JSON.stringify(data).includes('user_id'));
  }finally{globalThis.fetch=previous;}
});

test('member services share the original Vercel catalog router and do not require paid functions',()=>{
  const config=JSON.parse(readFileSync(new URL('../vercel.json',import.meta.url),'utf8'));
  const items=['member-brief','pwa-audit'];
  for(const id of items){
    assert.ok(config.rewrites.some(x=>x.source==='/api/'+id&&x.destination===(id==='pwa-audit'?'/api/pwa-quickkit-status?__3b_route=pwa-audit':'/api/catalog?__3b_route='+id)));
  }
  assert.equal(typeof catalog.fetch,'function');
  assert.equal(typeof foodApi.fetch,'function');
  assert.equal(typeof pwaAuditRoute.fetch,'function');
  assert.equal(typeof pwaStatus.fetch,'function');
  assert.ok(!config.rewrites.some(x=>x.source==='/api/food-product'));
});
