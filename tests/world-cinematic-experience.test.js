import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import {WORLD_REALMS,WORLD_MODULES,WORLD_MORE_SERVICES} from '../src/components/world-living-data.js';
import {REALM_STORIES,getRealmStory} from '../src/components/world-realm-stories.js';
import {WORLD_EDITORIAL_PATHWAYS,getWorldEditorialPathways} from '../src/components/world-editorial-pathways.js';
import {PAGE_HASHES} from '../src/lib/navigation.js';

const read=file=>readFileSync(new URL('../'+file,import.meta.url),'utf8');

test('all eight selected story realms use exact canonical guardian and value with no false hub claims',()=>{
 assert.equal(WORLD_REALMS.length,8);
 assert.equal(Object.keys(REALM_STORIES).length,8);
 for(let i=0;i<WORLD_REALMS.length;i++){
  const expected=WORLD_REALMS[i],actual=getRealmStory(expected.id);
  assert.equal(actual.realm.id,expected.id);
  assert.equal(actual.realm.guardian,expected.guardian);
  assert.equal(actual.realm.value,expected.value);
  assert.equal(actual.index,i+1);
  assert.ok(actual.story.epithet.length>12);
  assert.ok(actual.story.note.length>20);
 }
 assert.equal(getRealmStory('non-existing').realm.id,'france');
 const jsx=read('src/components/WorldRealmSpotlight.jsx');
 assert.match(jsx,/Univers narratif 3B/);
 assert.match(jsx,/aria-pressed/);
 assert.match(jsx,/page="world3b"/);
 assert.match(jsx,/page="passport"/);
 assert.match(jsx,/reference-cite-huit-heritages\.webp/);
 assert.ok(existsSync(new URL('../public/art/monde-3b/reference-cite-huit-heritages.webp',import.meta.url)));
 assert.doesNotMatch(jsx,/1\.2M|850K|39 pays|live visitors|visiteurs en direct/i);
});

test('each World tab has three real, unique navigation destinations',()=>{
 assert.deepEqual(Object.keys(WORLD_EDITORIAL_PATHWAYS),['world','realms','community','opportunities']);
 for(const [tab,pathway] of Object.entries(WORLD_EDITORIAL_PATHWAYS)){
  assert.equal(pathway.items.length,3,tab);
  assert.equal(new Set(pathway.items.map(item=>item.id)).size,3,tab);
  for(const item of pathway.items){
   assert.ok(Object.hasOwn(PAGE_HASHES,item.id),item.id);
   assert.ok(item.icon,tab+'/'+item.id);
   assert.ok(item.title.length>4);
  }
  assert.deepEqual(getWorldEditorialPathways(tab),pathway);
 }
 assert.equal(getWorldEditorialPathways('unknown').title,WORLD_EDITORIAL_PATHWAYS.world.title);
 const world=read('src/components/LivingWorldHome.jsx');
 assert.match(world,/<WorldNowFeed tab=\{tab\} goTo=\{goTo\}/);
 assert.match(world,/<WorldRealmSpotlight realmId=\{activeRealm\} onSelect=\{setActiveRealm\} goTo=\{goTo\}/);
 assert.equal(WORLD_MODULES.length,21);
 assert.ok(WORLD_MORE_SERVICES.some(item=>item.id==='cinema'));
});

test('cinematic CSS reuses gold master material tokens and preserves low-cost phones',()=>{
 const css=read('src/styles/world-living-cinema.css');
 const hex=new RegExp('#[0-9a-fA-F]{3,8}'+String.fromCharCode(92)+'b');
 assert.equal(hex.test(css),false);
 const radii=[...css.matchAll(/\bborder-radius\s*:\s*([^;}]+)/g)];
 const shadows=[...css.matchAll(/\bbox-shadow\s*:\s*([^;}]+)/g)];
 assert.ok(radii.length>3&&radii.every(item=>item[1].trim().startsWith('var(')));
 assert.ok(shadows.every(item=>item[1].trim().startsWith('var(')));
 assert.match(css,/prefers-reduced-motion:reduce/);
 assert.match(css,/@media\(max-width:370px\)/);
 assert.doesNotMatch(css,/background-image:\s*url\(['"]?https:/i);
});
