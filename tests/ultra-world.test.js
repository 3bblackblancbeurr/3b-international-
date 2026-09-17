import test from 'node:test';import assert from 'node:assert/strict';
import {ORIGIN_WORLD,ORIGIN_GATES,NEXUS_GATE,chunksAround,nexusVisible} from '../src/world/ultra-world-config.js';
import {COUNTRY_WORLDS} from '../src/world/country-worlds.js';
import {RARITIES,REWARDS,validateRarityWeights} from '../src/world/reward-catalog.js';
import {BUILDINGS,BUILD_CATEGORIES} from '../src/nexus/build-catalog.js';

test('Cité Origine is streamed instead of loaded as one giant scene',()=>{assert.equal(ORIGIN_WORLD.size,16000);assert.equal(ORIGIN_WORLD.chunkSize,256);assert.equal(chunksAround(0,0,true).length,9);assert.equal(chunksAround(0,0,false).length,25);});
test('eight country gates are physical and Nexus is separate',()=>{assert.equal(ORIGIN_GATES.length,8);assert.equal(new Set(ORIGIN_GATES.map(g=>g.id)).size,8);assert.equal(NEXUS_GATE.kind,'builder');assert.ok(!ORIGIN_GATES.some(g=>g.id==='nexus-builder'));});
test('Nexus visibility requires eight unique relays',()=>{assert.equal(nexusVisible({originRelays:['a','b','c','d','e','f','g']}),false);assert.equal(nexusVisible({originRelays:['a','b','c','d','e','f','g','h']}),true);});
test('all eight country worlds have authored gameplay beats',()=>{assert.equal(Object.keys(COUNTRY_WORLDS).length,8);for(const world of Object.values(COUNTRY_WORLDS)){assert.equal(world.missions.length,3);assert.equal(world.secrets.length,8);assert.ok(world.guardian&&world.value&&world.capital&&world.rural&&world.wild);}});
test('rarity economy totals exactly one billion and preserves global caps',()=>{assert.equal(validateRarityWeights(),true);assert.equal(RARITIES.reduce((n,r)=>n+r.weight,0),1_000_000_000);assert.equal(RARITIES.find(r=>r.id==='unique').weight,1);assert.equal(RARITIES.find(r=>r.id==='ultimate').supply,8);assert.equal(RARITIES.find(r=>r.id==='unique').supply,1);});
test('reward and build catalogs cover every planned family',()=>{assert.equal(REWARDS.length,8*10*8);assert.ok(BUILDINGS.length>=BUILD_CATEGORIES.length*8);for(const category of BUILD_CATEGORIES)assert.ok(BUILDINGS.some(b=>b.category===category));});
