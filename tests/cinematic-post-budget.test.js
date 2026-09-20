import test from 'node:test';
import assert from 'node:assert/strict';
import {cinematicPostBudget} from '../src/world/postprocessing.js';
test('cinematic post-processing scales down on weak and fluid hardware',()=>{
 const weak=cinematicPostBudget('auto',2,4),balanced=cinematicPostBudget('auto',4,6),detail=cinematicPostBudget('detail',8,8),fluid=cinematicPostBudget('fluid',8,8);
 assert.ok(weak.scale<balanced.scale);
 assert.ok(fluid.scale<balanced.scale);
 assert.equal(detail.scale,1);
 assert.ok(weak.flare<detail.flare);
 assert.ok(weak.grain<detail.grain);
});
