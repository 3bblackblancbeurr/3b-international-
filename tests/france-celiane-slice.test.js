import test from 'node:test';
import assert from 'node:assert/strict';
import {blankSave,worldItems} from '../src/world/rules.js';
import {applyWorldAction} from '../src/world/engine.js';
import {cardById} from '../src/world/catalog.js';
import {GUARDIAN_VALUES} from '../src/world/guardian-values.js';
import {PARIS_BUILDINGS,PARIS_LANES} from '../src/world/paris-layout.js';

test('France vertical slice uses canonical Céliane and Justice guardian',()=>{
 let visited=applyWorldAction(blankSave(),{type:'visit',region:'france'});
 visited={...visited,adventure:{...visited.adventure,values:{...visited.adventure.values,france:{step:3,completed:true,choices:GUARDIAN_VALUES.france.choices.map(([id])=>id)}}}};
 const guardian=worldItems('france',visited).find((item)=>item.type==='guardian');
 assert.equal(guardian.card,'C165');
 assert.match(guardian.name,/Céliane/);
 assert.match(guardian.detail,/Justice/);
 assert.match(cardById[guardian.card].power,/Justice/);
});

test('France slice keeps a substantial Paris blockout and traversable street network',()=>{
 assert.ok(PARIS_BUILDINGS.length>=8);
 assert.ok(PARIS_LANES.length>=5);
 assert.ok(PARIS_BUILDINGS.some((building)=>building.id==='archives'));
 assert.ok(PARIS_BUILDINGS.some((building)=>building.id==='atelier'&&building.interior));
 assert.ok(PARIS_BUILDINGS.some((building)=>building.id==='refuge'&&building.interior));
});
