import test from 'node:test';
import assert from 'node:assert/strict';
import {validFoodBarcode} from '../src/health/foodBarcode.js';
import {allergenLabel} from '../src/health/allergenLabels.js';
import {cinemaSearchLinks} from '../src/member/cinema-search.js';
import {MEMBER_SPACES, COUNTRY_INDEX, ADMIN_GUIDES, CINEMA_GUIDES, FINANCE_GUIDES, countryEventsHref,countryNewsHref,countryFor,contactHref} from '../src/member/memberSources.js';
import {fetchFoodProduct} from '../server/food-product.js';
import {fetchMemberBrief} from '../server/member-brief.js';
import {fetchOfficialDirectory,validLocality,cleanOfficialRecord} from '../server/official-directory.js';
import {fetchFrenchPublicEvents,parseFrenchPublicEvents} from '../server/french-public-events.js';
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
   +'<item><title>France &amp; Europe</title><link>https://www.france24.com/fr/europe/duplicate-article</link><pubDate>'+date+'</pubDate></item>'
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


test('French cultural events filter expired and unsafe notices without inventing dates',()=>{
 const old='<item><title>Old</title><link>https://openagenda.com/culture/events/old</link><ev:startdate>2026-10-01T09:30:00</ev:startdate></item>';
 const valid='<item><title>Festival &amp; patrimoine</title><link>https://openagenda.com/culture/events/festival-2026</link><ev:startdate>2026-10-20T10:30:00</ev:startdate><ev:enddate>2026-10-20T19:00:00</ev:enddate><ev:location>Lyon, France</ev:location><pubDate>Fri, 16 Oct 2026 13:00:00 GMT</pubDate></item>';
 const evil='<item><title>Malicious</title><link>https://bad.example/festival</link><ev:startdate>2026-10-20T10:30:00</ev:startdate></item>';
 const items=parseFrenchPublicEvents('<rss><channel>'+old+valid+evil+'</channel></rss>',new Date('2026-10-16T15:00:00Z'));
 assert.equal(items.length,1);
 assert.equal(items[0].title,'Festival & patrimoine');
 assert.equal(items[0].starts_local,'2026-10-20T10:30:00');
 assert.equal(items[0].location,'Lyon, France');
 assert.equal(items[0].source,'Ministère de la Culture · OpenAgenda');
});
test('real event API path uses a single allowlisted open data source',async()=>{
 const previous=globalThis.fetch,received=[];
 try{
  globalThis.fetch=async u=>{
   received.push(String(u));
   return new Response('<rss><item><title>Concert</title><link>https://openagenda.com/culture/events/concert</link><ev:startdate>2099-01-02T10:00:00</ev:startdate></item></rss>',{status:200,headers:{'Content-Type':'application/rss+xml'}});
  };
  const result=await catalog.fetch(new Request('https://3b.example/api/catalog?__3b_route=member-events'));
  const payload=await result.json();
  assert.equal(result.status,200);
  assert.equal(payload.items.length,1);
  assert.equal(new URL(received[0]).hostname,'openagenda.com');
  assert.match(received[0],/events\.v2\.rss/);
  assert.equal(payload.license,'Licence Ouverte 2.0');
  assert.ok(!JSON.stringify(payload).includes('user_id'));
 }finally{globalThis.fetch=previous;}
});

test('member services share the original Vercel catalog router and do not require paid functions',()=>{
  const config=JSON.parse(readFileSync(new URL('../vercel.json',import.meta.url),'utf8'));
  const items=['member-brief','member-events','official-directory','pwa-audit'];
  for(const id of items){
    assert.ok(config.rewrites.some(x=>x.source==='/api/'+id&&x.destination===(id==='pwa-audit'?'/api/pwa-quickkit-status?__3b_route=pwa-audit':'/api/catalog?__3b_route='+id)));
  }
  assert.equal(typeof catalog.fetch,'function');
  assert.equal(typeof foodApi.fetch,'function');
  assert.equal(typeof pwaAuditRoute.fetch,'function');
  assert.equal(typeof pwaStatus.fetch,'function');
  assert.ok(!config.rewrites.some(x=>x.source==='/api/food-product'));
});

test('official directory validates free-form city queries before calling the government API',async()=>{
 assert.equal(validLocality('Thonon-les-Bains'),true);
 assert.equal(validLocality('Saint-Étienne'),true);
 assert.equal(validLocality(''),false);
 assert.equal(validLocality('X'),false);
 assert.equal(validLocality('x\" OR 1=1 --'),false);
 assert.equal(validLocality('https://localhost'),false);
 const bad=await fetchOfficialDirectory(new Request('https://3b.example/api/official-directory?ville='+encodeURIComponent('x\" OR 1=1')));
 assert.equal(bad.status,400);
 const method=await fetchOfficialDirectory(new Request('https://3b.example/api/official-directory?ville=Paris',{method:'POST'}));
 assert.equal(method.status,405);
});
test('only genuine official DILA directory entries can appear in the app',()=>{
 const row={nom:'Mairie - Thonon-les-Bains',
  adresse:JSON.stringify([{type_adresse:'Adresse',numero_voie:'1 place de l\'Hôtel-de-Ville',code_postal:'74200',nom_commune:'Thonon-les-Bains'}]),
  telephone:JSON.stringify([{valeur:'04 50 70 69 68'}]),
  url_service_public:'https://lannuaire.service-public.gouv.fr/auvergne-rhone-alpes/haute-savoie/123',
  date_modification_datetime:'2026-10-01T12:00:00Z',
 };
 const data=cleanOfficialRecord(row);
 assert.equal(data.name,'Mairie - Thonon-les-Bains');
 assert.match(data.address,/74200 Thonon/);
 assert.equal(data.phone,'04 50 70 69 68');
 assert.ok(!cleanOfficialRecord({...row,url_service_public:'https://lannuaire.service-public.gouv.fr.evil.example/steal'}));
 assert.ok(!cleanOfficialRecord({...row,url_service_public:'javascript:alert(1)'}));
});
test('directory lookup returns public services without leaking user data or GPS',async()=>{
 const orig=globalThis.fetch;
 let requested;
 try{
  globalThis.fetch=async url=>{
   requested=url;
   return new Response(JSON.stringify({results:[
    {nom:'Maison France Services - Lyon',adresse:'[]',telephone:'[]',
     url_service_public:'https://lannuaire.service-public.gouv.fr/auvergne-rhone-alpes/rhone/a'},
    {nom:'Phishing',url_service_public:'https://evil.example/'}
   ]}),{status:200,headers:{'Content-Type':'application/json'}});
  };
  const result=await catalog.fetch(new Request('https://3b.example/api/catalog?__3b_route=official-directory&ville=Lyon'));
  const data=await result.json();
  assert.equal(result.status,200);
  assert.equal(data.services.length,1);
  assert.equal(data.services[0].name,'Maison France Services - Lyon');
  assert.equal(new URL(requested).hostname,'api-lannuaire.service-public.gouv.fr');
  assert.match(new URL(requested).searchParams.get('where'),/search\(nom, "Lyon"\)/);
  assert.equal(data.services[0].lat,undefined);
  assert.equal(data.services[0].user_id,undefined);
 }finally{globalThis.fetch=orig;}
});

test('cinema search goes only to verified official legal services',()=>{
 const title='Le cinéma & la vie';
 const links=cinemaSearchLinks(title);
 assert.equal(new URL(links.arte).hostname,'www.arte.tv');
 assert.equal(new URL(links.france).hostname,'www.france.tv');
 assert.equal(new URL(links.arte).searchParams.get('genre'),'movies');
 assert.equal(new URL(links.arte).searchParams.get('q'),title);
 assert.equal(new URL(links.france).searchParams.get('q'),title);
 assert.match(cinemaSearchLinks('').arte,/arte\.tv\/fr\/videos\/cinema\/films\//);
 const hostile=cinemaSearchLinks('https://evil.example/?q=film');
 assert.equal(new URL(hostile.arte).hostname,'www.arte.tv');
 assert.equal(new URL(hostile.france).hostname,'www.france.tv');
 assert.ok(cinemaSearchLinks('a'.repeat(1000)).title.length<=80);
});
