import test from 'node:test';
import assert from 'node:assert/strict';
import {parseFeed,fetchSports,FEEDS,decodeXML} from '../supabase/functions/ecosystem/sports.js';
import {DEFAULT_DESIGN,validateDesign,textilePrompt,GARMENTS} from '../shared/studio.js';
import {memberCardSvg} from '../shared/member-card.js';
import {TIERS} from '../shared/loyalty.js';
import {readLocation} from '../src/lib/navigation.js';
const item=(title,link,date='Thu, 10 Sep 2026 12:00:00 GMT')=>'<item><title><![CDATA['+title+']]></title><link>'+link+'</link><pubDate>'+date+'</pubDate></item>';
test('sport feeds preserve attribution, date and readable titles; URL helps classify sports',()=>{
 const a=parseFeed('<rss>'+item('A &amp; B','https://www.bbc.co.uk/sport/football/123')+'</rss>',FEEDS[1],Date.parse('2026-09-10T14:00:00Z'));
 assert.equal(a.length,1);assert.equal(a[0].source,'BBC Sport');assert.equal(a[0].category,'Football');assert.equal(a[0].title,'A & B');assert.equal(a[0].language,'en');assert.equal(a[0].publishedAt,'2026-09-10T12:00:00.000Z');
});
test('sport rejects hostile links, credentials, non-source domains, unknown dates and future entries',()=>{
 assert.deepEqual(parseFeed(item('Archive','https://bbc.co.uk/sport/tennis/old','Mon, 01 Jan 2024 12:00:00 GMT'),FEEDS[1],Date.parse('2026-09-10T14:00:00Z')),[]);
 const xml=['javascript:alert(1)','https://evil.test/sport','https://bbc.co.uk.evil.test/sport','https://user:secret@bbc.co.uk/sport','http://bbc.co.uk/sport'].map(u=>item('Football',u)).join('')+item('Bad date','https://bbc.co.uk/sport','invalid')+item('Future','https://bbc.co.uk/sport','Thu, 10 Sep 2030 12:00:00 GMT');
 assert.deepEqual(parseFeed(xml,FEEDS[1],Date.parse('2026-09-10T14:00:00Z')),[]);assert.equal(decodeXML('&#99999999999; &lt;script&gt;'),'<script>');
});
test('sport survives one unavailable source but never fabricates news when both fail',async()=>{
 const d=await fetchSports(async url=>url===FEEDS[0].url?new Response(item('Football','https://www.france24.com/fr/sports/article',new Date().toUTCString())):new Response('',{status:503}));assert.equal(d.partial,true);assert.equal(d.articles.length,1);assert.equal(d.sources[1].available,false);
 await assert.rejects(fetchSports(async()=>new Response('',{status:503})),/momentanément indisponibles/);
});
test('studio validates all choices and prevents arbitrary markup in color attributes',()=>{
 for(const garment of GARMENTS)assert.equal(validateDesign({...DEFAULT_DESIGN,garment}).garment,garment);
 for(const patch of [{color:'red" onload="alert(1)'},{garment:'script'},{cut:null},{pattern:[]}])assert.throws(()=>validateDesign({...DEFAULT_DESIGN,...patch}));
 const safe=validateDesign({...DEFAULT_DESIGN,user_id:'forged',price:1});assert.equal(safe.user_id,undefined);assert.equal(safe.price,undefined);assert.match(textilePrompt(DEFAULT_DESIGN,'Une poche intérieure'),/Une poche intérieure/);
});
test('loyalty cards are exportable self-contained SVG with escaped member data and controlled tier colors',()=>{
 for(const tier of TIERS){const svg=memberCardSvg({name:'<script> & "name"',user_id:'<x>123456'},tier);assert.match(svg,/<svg/);assert.ok(!svg.includes('<script>'));assert.match(svg,/&lt;script&gt;/);assert.ok(svg.includes(tier.name));assert.match(svg,/PAS UN MOYEN DE PAIEMENT/);assert.ok(!svg.includes('href="http'));}
 assert.ok(!memberCardSvg(null,{id:'unknown',color:'" onload="x'}).includes('onload'));
});
test('old music bookmarks redirect to religion and the XP guide has a stable direct URL',()=>{
 assert.equal(readLocation({hash:'#musique'}).page,'religion');assert.equal(readLocation({hash:'#religion'}).page,'religion');assert.equal(readLocation({hash:'#guide'}).page,'guide');
});

