import test from 'node:test';
import assert from 'node:assert/strict';
import {SHOP_TIERS,shopTierFor,nextShopTier,discountFor,tierFor} from '../shared/loyalty.js';
import {boutiqueCardSvg,boutiquePrintHtml,boutiqueArtPath} from '../shared/boutique-card.js';
test('boutique cards follow loyalty points and the actual checkout discount, independently of XP',()=>{
 for(const [points,id,percent] of [[0,'club',0],[999,'club',0],[1000,'argent',5],[2999,'argent',5],[3000,'or',8],[6999,'or',8],[7000,'noire',10],[999999,'noire',10]]){
  assert.equal(shopTierFor(points).id,id);assert.equal(shopTierFor(points).percent,percent);assert.equal(discountFor(points),percent);
 }
 assert.equal(shopTierFor(-1).id,'club');assert.equal(shopTierFor(NaN).id,'club');
 assert.equal(nextShopTier(0).id,'argent');assert.equal(nextShopTier(7000),null);
 assert.equal(tierFor(100000).id,'eternal');assert.equal(shopTierFor(0).id,'club');
});
test('boutique artwork and foil use only defined cards, while member names are escaped',()=>{
 const payload='<img src=x onerror="alert(1)">';const svg=boutiqueCardSvg({name:payload,points:0},{id:'rogue',color:'url(https://bad.test)'},{artworkDataUrl:'https://bad.test'});
 assert.ok(svg.includes('&lt;img'));assert.ok(!svg.includes('<img'));assert.ok(!svg.includes('https://bad.test'));assert.ok(svg.includes('Club'));
 assert.equal(boutiqueArtPath({id:'../secret'}),'/loyalty-art/boutique-club.webp');
 for(const t of SHOP_TIERS)assert.ok(boutiqueCardSvg(null,t).includes(t.name));
});
test('a full unique membership number is used and credentials are never exported',()=>{
 const p={name:'Membre',user_id:'aaaaaaaa-bbbb-cccc-dddd-111111111111',points:3000,password:'private-password',recovery:'private-recovery'};
 const first=boutiqueCardSvg(p),second=boutiqueCardSvg({...p,user_id:'aaaaaaaa-bbbb-cccc-dddd-222222222222'});
 assert.ok(first.includes('3B-FID-AAAAAAAABBBBCCCCDDDD111111111111'));assert.notEqual(first,second);
 assert.ok(!first.includes(p.password));assert.ok(!first.includes(p.recovery));assert.ok(first.includes('−8 %'));
});
test('printable boutique card is self-contained and retains conditions and physical dimensions',()=>{
 const profile={name:'<script>alert(1)</script>',points:7000};
 const svg=boutiqueCardSvg(profile,undefined,{artworkDataUrl:'data:image/webp;base64,UklGRg=='});
 const html=boutiquePrintHtml(svg,profile);
 assert.ok(html.includes('85.6mm'));assert.ok(html.includes('53.98mm'));assert.ok(html.includes('data:image/webp;base64,UklGRg=='));assert.ok(html.includes('Hors livraison'));
 assert.ok(!html.includes('<script>'));assert.ok(html.includes('&lt;script&gt;'));assert.ok(html.includes('Carte Noire'));
});
