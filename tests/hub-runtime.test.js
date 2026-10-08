import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildHubRuntimeItems, selectNpcBudget, selectHubNpcRoster } from '../src/world/hub/runtime.js';
import {HUB_METROPOLIS,hubDistrictPosition} from '../src/world/hub/metropolis.js';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..', 'src', 'world', 'hub', 'data');
const read = (name) => JSON.parse(readFileSync(join(root, name), 'utf8'));
const plan = read('hub-master-plan-v2.json');
const npcs = read('npcs-v1.json');
const missions = read('missions-v1.json');
const events = read('events-v1.json');
const secrets = read('secrets-v1.json');

test('Hub runtime exposes every canonical district and mission', () => {
  const runtime = buildHubRuntimeItems({ plan, npcs, missions, events, secrets, profile: 'desktop' });
  assert.equal(runtime.meta.districts, 10);
  assert.equal(runtime.meta.missions, 19);
  assert.equal(runtime.meta.trainStops, 10);
  assert.equal(runtime.meta.boatStops, 5);
  assert.equal(runtime.meta.telephericStops, 6);
  assert.equal(runtime.meta.ziplineStarts, 6);
  assert.equal(runtime.meta.events, 10);
  assert.equal(runtime.meta.secrets, 16);
  assert.equal(runtime.meta.heritagePlatforms, 8);
  assert.equal(runtime.meta.evolutionStage, 0);
  assert.ok(runtime.meta.skybridges >= 2);
  assert.equal(new Set(runtime.items.map((item) => item.id)).size, runtime.items.length);
});

test('Hub runtime applies mobile NPC budgets without losing canonical total', () => {
  const runtime = buildHubRuntimeItems({ plan, npcs, missions, events, secrets, profile: 'mobileMedium' });
  assert.equal(runtime.meta.npcsTotal, 24);
  assert.equal(runtime.meta.npcsActive, selectNpcBudget(plan, 'mobileMedium'));
  assert.ok(runtime.meta.npcsActive <= runtime.meta.npcsTotal);
});

test('Every runtime item has finite coordinates in the hub', () => {
  const runtime = buildHubRuntimeItems({ plan, npcs, missions, events, secrets, profile: 'desktop' });
  for (const item of runtime.items) {
    assert.ok(Number.isFinite(item.x), item.id);
    assert.ok(Number.isFinite(item.z), item.id);
    assert.ok(Math.hypot(item.x, item.z) < HUB_METROPOLIS.radius, item.id);
  }
});

test('Canonical first playable slice districts resolve to positions', () => {
  for (const district of plan.firstPlayableSlice.districts) {
    assert.ok(hubDistrictPosition(plan, district), district);
  }
});


test('Hub runtime carries restored country progression into the metropolis',()=>{
  const seals=['france','algerie','espagne','maroc','italie'];
  const runtime=buildHubRuntimeItems({plan,npcs,missions,events,secrets,profile:'desktop',seals,restoredRegions:[...seals]});
  assert.equal(runtime.meta.evolutionStage,3);
  assert.equal(runtime.meta.heritagePlatforms,8);
  assert.equal(runtime.meta.skybridges,8);
  const platforms=runtime.items.filter(item=>item.type==='hubHeritagePlatform');
  assert.equal(platforms.filter(item=>item.restored).length,5);
});

test('mobile Hub exposes the full 24-person canon over a week instead of hiding its final residents forever',()=>{
 const seen=new Set(),current=[];
 for(let day=0;day<28;day++){
  const dateKey=new Date(Date.UTC(2026,9,1+day)).toISOString().slice(0,10);
  const eventContext={dateKey,hour:12,day:4,weather:'clear'};
  const roster=selectHubNpcRoster(npcs,18,{eventContext});
  assert.equal(roster.length,18,'stable 18-person mobile actor budget');
  assert.ok(roster.some(row=>row.npc.id==='mael_rivière'),'the first guide must always welcome new and returning players');
  assert.equal(new Set(roster.map(row=>row.npc.id)).size,18);
  current.push(roster.map(row=>row.npc.id).join(','));
  for(const row of roster)seen.add(row.npc.id);
 }
 assert.ok(new Set(current).size>1,'city residents change routine across real civil days');
 for(const id of ['meryem_alaoui','noah_leroux','kadra_zerrouki','soraya_najem'])assert.ok(seen.has(id),id+' must be accessible on ordinary mobile devices');
});

test('active mission characters cannot disappear behind mobile limits or daytime train schedules',()=>{
 const hubState={missions:{wagon_eight:{status:'active',claimed:false},eight_signals:{status:'active',claimed:false}}};
 const context={dateKey:'2026-10-08',hour:12,day:4,weather:'clear'};
 const runtime=buildHubRuntimeItems({plan,npcs,missions,events,secrets,profile:'mobileMedium',hubState,eventContext:context});
 const residents=runtime.items.filter(item=>item.type==='hubNpc');
 assert.equal(residents.length,18);
 assert.ok(residents.some(item=>item.npcId==='the_conductor'),'the mission conductor is reachable even in daytime');
 assert.ok(residents.some(item=>item.npcId==='noah_leroux'),'tower mission-giver remains present');
 assert.equal(runtime.meta.npcsTotal,24);
 assert.equal(runtime.meta.npcsActive,18);
});
