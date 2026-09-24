import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {HUB_CANON_LAWS,HUB_DISTRICT_NAMES} from '../src/world/hub/canon-laws.js';
import {STORY_CANON} from '../src/world/story-canon.js';

const platform=readFileSync(new URL('../src/world/heritage-platform.js',import.meta.url),'utf8');
const runtimeItems=readFileSync(new URL('../src/world/runtime-items.js',import.meta.url),'utf8');

test('Cité des Huit Héritages canon keeps the safe Hub and ten useful districts',()=>{
 assert.equal(HUB_CANON_LAWS.safeZone.unique,true);
 assert.equal(HUB_CANON_LAWS.safeZone.hostileMonsters,false);
 assert.equal(HUB_CANON_LAWS.safeZone.wildPvP,false);
 assert.equal(HUB_CANON_LAWS.safeZone.damage,false);
 assert.equal(HUB_CANON_LAWS.safeZone.death,false);
 assert.equal(HUB_CANON_LAWS.structure.districts,10);
 assert.equal(HUB_DISTRICT_NAMES.length,10);
 assert.equal(new Set(HUB_DISTRICT_NAMES).size,10);
});

test('Cité canon keeps Kaïs as Porteur du Lien and exactly eight Guardian values',()=>{
 assert.equal(HUB_CANON_LAWS.story.hero,'Kaïs');
 assert.equal(HUB_CANON_LAWS.story.heroRole,'Porteur du Lien');
 assert.deepEqual(HUB_CANON_LAWS.story.finalRequirement,{countries:8,guardians:8,values:8,fragments:8});
 assert.equal(Object.keys(HUB_CANON_LAWS.countries).length,8);
 assert.equal(STORY_CANON.hero.role,'Porteur du Lien');
});

test('central Heritage platform is civic and does not rebuild the obsolete eight-country wheel',()=>{
 assert.doesNotMatch(platform,/Eight radial heritage axes/);
 assert.doesNotMatch(platform,/const country=COUNTRIES\[i\]/);
 assert.match(platform,/actual eight[\s\S]*country Portes live on the outer metropolis ring/i);
 assert.match(platform,/for\(let i=0;i<6;i\+\+\)/);
 assert.match(platform,/setProgress/);
});

test('world runtime removes legacy hub portal items before inserting the canonical gate runtime',()=>{
 assert.match(runtimeItems,/baseWithoutLegacyPortals=base\.filter\(item=>item\.type!=='portal'\)/);
 assert.match(runtimeItems,/return \[\.\.\.baseWithoutLegacyPortals,\.\.\.hub\]/);
});

test('canon explicitly preserves the 16-weapon arsenal and visible city evolution',()=>{
 assert.equal(HUB_CANON_LAWS.arsenal.canonicalWeapons,16);
 assert.equal(HUB_CANON_LAWS.progression.visibleEvolution,true);
 assert.equal(HUB_CANON_LAWS.progression.npcMemory,true);
 assert.match(HUB_CANON_LAWS.story.loop,/Gardien/);
});
