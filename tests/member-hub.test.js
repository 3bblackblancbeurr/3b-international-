import test from 'node:test';
import assert from 'node:assert/strict';
import {MEMBER_HUB_CARDS,findMemberHubCards} from '../src/member/member-hub-model.js';
import {WORLD_MODULES,findWorldModules} from '../src/components/world-living-data.js';
import {PAGE_HASHES,getPageHref,readLocation} from '../src/lib/navigation.js';
import {normalizeAtlasPreferences} from '../src/components/atlas-preferences.js';
import {companionApplicationReply,companionDestinationAllowed,COMPANION_EXPLORER} from '../src/companion/companion-application.js';
test('fidelity has one member destination on home while its legacy route and inner member card remain usable',()=>{
 assert.equal(WORLD_MODULES.filter(item=>item.id==='member').length,1);assert.equal(WORLD_MODULES.some(item=>item.id==='loyalty'),false);
 assert.equal(MEMBER_HUB_CARDS.filter(item=>item.id==='loyalty').length,1);
 assert.deepEqual(normalizeAtlasPreferences({favorites:['loyalty','member','health']}).favorites,['member','health']);
 assert.deepEqual(findWorldModules({query:'carte fidélité'}).map(item=>item.id),['member']);
 assert.equal(readLocation(new URL('https://3b.example/#cartes')).page,'loyalty');
 for(const item of MEMBER_HUB_CARDS)assert.ok(Object.hasOwn(PAGE_HASHES,item.id));
});
test('member search combines accents and words and preserves only the chosen group',()=>{
 assert.deepEqual(findMemberHubCards({query:'FIDELITE CARTE'}).map(item=>item.id),['loyalty']);
 assert.ok(findMemberHubCards({group:'identity'}).every(item=>item.group==='identity'));assert.equal(findMemberHubCards({query:'inexistantxyz'}).length,0);
});
test('companion routes to current capabilities without reading private data or allowing arbitrary destinations',()=>{
 for(const [query,id] of [['mes points','member'],['mes papiers pour France Travail','admin'],['le bracelet','health'],['les actualités','news'],['créer ma crypto','finance'],['association','association'],['arbre religion','religion']]){
  const reply=companionApplicationReply(query);assert.equal(reply.choices[0].page,id);assert.ok(reply.message.length>50);assert.ok(reply.choices.every(choice=>companionDestinationAllowed(choice.page)));
 }
 for(const value of ['https://evil.example','javascript:alert(1)','control','__proto__',null])assert.equal(companionDestinationAllowed(value),false);
 assert.match(companionApplicationReply('lis mes papiers').message,/ne consulte pas/);
 assert.equal(companionApplicationReply('mes points',{memberRegistered:false}).choices[0].label,'Connexion / inscription');
 assert.ok(COMPANION_EXPLORER.every(item=>getPageHref(item.page,new URL('https://3b.example'))));
});
