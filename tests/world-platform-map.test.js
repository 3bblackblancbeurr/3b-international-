import test from 'node:test';
import assert from 'node:assert/strict';
import {cartographyField} from '../src/world/cartography-field.js';
import {blankSave} from '../src/world/rules.js';
import {worldRuntimeItems} from '../src/world/runtime-items.js';
import {HUB_PLATFORM} from '../src/world/hub/platform-layout.js';

test('Nexus map uses the physical deck, five basins and eight actual portal routes',()=>{
 const field=cartographyField('hub'),items=worldRuntimeItems('hub',blankSave());
 assert.equal(field.radius,HUB_PLATFORM.radius);assert.equal(field.lakes.length,5);
 const roads=field.roads.filter(r=>r.id.startsWith('gate:'));
 assert.equal(roads.length,8);
 for(const portal of items.filter(i=>i.type==='portal'))assert.ok(roads.some(r=>Math.hypot(r.points.at(-1).x-portal.x,r.points.at(-1).z-portal.z)<.001));
 for(const b of items.filter(i=>i.type==='hubBuilding')){
  const drawn=field.buildings.find(p=>p.buildingId===b.buildingId);assert.ok(drawn);
  assert.equal(drawn.x,b.buildingX);assert.equal(drawn.z,b.buildingZ);assert.equal(drawn.width,b.width);assert.equal(drawn.depth,b.depth);
 }
});

test('country maps retain their terrain and landmark navigation',()=>{
 for(const region of ['france','algerie','maroc','tunisie','espagne','italie','turquie','estonie']){
  const field=cartographyField(region);assert.equal(field.radius,260);assert.ok(field.roads.length);assert.ok(field.buildings.length);assert.ok(field.lake.r>0);
 }
});
