import test from 'node:test';
import assert from 'node:assert/strict';
import {COUNTRIES} from '../src/world/catalog.js';
import {blankSave} from '../src/world/rules.js';
import {BIOMES,HUB_WORLD_RADIUS,createTerrainField,landscapeItems,worldRadiusFor} from '../src/world/terrain.js';
import {settlementPlan} from '../src/world/settlements.js';

const radial=item=>Math.hypot(item.x,item.z);

test('the Nexus masterplan preserves monumental breathing room and an exterior archipelago',()=>{
 const save=blankSave(),field=createTerrainField('hub',save),items=landscapeItems('hub',save);
 assert.equal(worldRadiusFor('hub'),HUB_WORLD_RADIUS);
 assert.equal(field.radius,520);
 assert.equal(BIOMES.hub.scale,6.2);

 const gates=items.filter(item=>item.type==='portal'&&COUNTRIES.some(country=>country.id===item.id));
 assert.equal(gates.length,8);
 assert.ok(gates.every(gate=>radial(gate)>190&&radial(gate)<320),'The eight gates must read as separated districts, not a compact ring.');

 const final=items.find(item=>item.id==='final');
 assert.ok(final&&radial(final)<30,'The Broken Circle remains the visual origin.');

 const services=items.filter(item=>['atelier','training','passport','archives','transit'].includes(item.type));
 assert.equal(services.length,5);
 assert.ok(services.every(item=>radial(item)>175),'Civic services must not crowd the monument.');

 const vistas=items.filter(item=>item.type==='vista');
 assert.ok(vistas.length>=4);
 assert.ok(vistas.every(item=>radial(item)>400&&radial(item)<field.radius),'Exterior destinations belong to the outer crown.');

 const plan=settlementPlan('hub');
 assert.equal(plan.roads.filter(road=>road.kind==='ring').length,3);
 assert.equal(plan.roads.filter(road=>road.kind==='link').length,4);
 assert.equal(plan.roads.filter(road=>road.kind==='boulevard').length,8);
});
