import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {activeDeals,MAX_AGE_MS,safeSource} from '../src/deals/feed.js';
import {readLocation,getPageHref} from '../src/lib/navigation.js';
const now=Date.parse('2026-10-15T15:30:00Z');
const offer={id:'ok',category:'sport',title:'Offre réelle',price:'10 €',benefit:'5 € économisés',conditions:'Stock limité',location:'France',source:'Enseigne',url:'https://example.com/product',verifiedAt:new Date(now-1000).toISOString(),expiresAt:new Date(now+1000).toISOString()};
const select=(...deals)=>activeDeals({deals},now);
test('expire on merchant deadline, stale verification, future or invalid dates',()=>{
 assert.equal(select(offer).length,1);
 for(const change of [{expiresAt:new Date(now).toISOString()},{verifiedAt:new Date(now-MAX_AGE_MS).toISOString()},{verifiedAt:new Date(now+1).toISOString()},{startsAt:new Date(now+1).toISOString()},{verifiedAt:'bad'},{expiresAt:'bad'},{conditions:''},{url:'javascript:alert(1)'}])assert.equal(select({...offer,...change}).length,0);
 assert.equal(select({...offer,expiresAt:null}).length,1);
});
test('no duplicate offers or URLs and maximum three in each category',()=>{
 const offers=Array.from({length:5},(_,i)=>({...offer,id:`${i}`,url:`https://example.com/${i}`}));
 assert.equal(select(...offers).length,3);
 assert.equal(select(offer,{...offer,id:'other'}).length,1);
 assert.equal(select(...offers,{...offer,category:'alimentation',id:'food',url:'https://example.com/food'}).length,4);
 assert.equal(safeSource('http://example.com'),null);assert.equal(safeSource('https://u:p@example.com'),null);
});
test('route opens directly and navigates from existing app URL',()=>{
 assert.equal(readLocation({hash:'#3-bons-plans',pathname:'/',search:''}).page,'deals');
 assert.equal(getPageHref('deals',{href:'https://example.com/#accueil'}),'/#3-bons-plans');
});
test('initial feed contains only complete current offers at publication',()=>{
 const feed=JSON.parse(readFileSync(new URL('../public/data/3-bons-plans.json',import.meta.url)));
 assert.equal(feed.schemaVersion,1);assert.equal(activeDeals(feed,Date.parse(feed.publishedAt)).length,feed.deals.length);
});
