import test from 'node:test';
import assert from 'node:assert/strict';
import {validFoodBarcode} from '../src/health/foodBarcode.js';
import {MEMBER_SPACES, COUNTRY_INDEX, ADMIN_GUIDES, CINEMA_GUIDES, FINANCE_GUIDES, countryEventsHref,countryNewsHref,countryFor,contactHref} from '../src/member/memberSources.js';
import foodProduct from '../api/food-product.js';
import worldBrief from '../api/member-brief.js';

function response(){
  return {headers:{},code:200,body:null,
    setHeader(name,value){this.headers[name.toLowerCase()]=value;return this;},
    status(code){this.code=code;return this;},
    json(body){this.body=body;return this;},
  };
}
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
test('food lookup rejects non-GET and unsupported barcodes without network',async()=>{
  const notGet=response(),bad=response();
  await foodProduct({method:'POST',query:{code:'3017620422003'}},notGet);
  await foodProduct({method:'GET',query:{code:'1.1.1.1/file'}},bad);
  assert.equal(notGet.code,405);
  assert.equal(bad.code,400);
  assert.equal(bad.body.error,'Code-barres invalide');
  assert.equal(bad.headers['x-content-type-options'],'nosniff');
});
test('world brief is strict fixed-source-only API',async()=>{
  const notGet=response(),bad=response();
  await worldBrief({method:'POST',query:{feed:'world'}},notGet);
  await worldBrief({method:'GET',query:{feed:'http://example.com'}},bad);
  assert.equal(notGet.code,405);
  assert.equal(bad.code,400);
  assert.equal(bad.headers['x-content-type-options'],'nosniff');
});
