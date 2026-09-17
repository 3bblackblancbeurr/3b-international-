import test from 'node:test';
import assert from 'node:assert/strict';
import {pointerStick,createQualityController} from '../src/world/motion.js';
import {DEFAULT_ORBIT,restoreOrbit} from '../src/world/orbit.js';
import {parisRenderBudget} from '../src/world/paris-district.js';
import {regionalRenderBudget} from '../src/world/regional-district.js';
import {floraRenderBudget} from '../src/world/flora.js';
import {meadowRenderBudget} from '../src/world/vegetation.js';
import {isCelianeResident} from '../src/world/models.js';
import {cardById} from '../src/world/catalog.js';
import {CHAPTERS,chapterObjective} from '../src/world/chapters.js';
import {blankSave,beacon} from '../src/world/rules.js';

test('landscape thumb stick keeps a dead zone and progressive analog travel',()=>{
 assert.deepEqual(pointerStick(4,3),{x:0,z:0});
 const walk=pointerStick(15,0),run=pointerStick(80,0);
 assert.ok(walk.x>0&&walk.x<1);
 assert.ok(run.x>.99&&run.x<=1);
 assert.equal(walk.z,0);
});

test('old close camera preset migrates to the wider exploration framing',()=>{
 const migrated=restoreOrbit({version:2,yaw:0,pitch:.24,distance:24});
 assert.equal(migrated.distance,DEFAULT_ORBIT.distance);
 assert.equal(migrated.pitch,DEFAULT_ORBIT.pitch);
 assert.ok(DEFAULT_ORBIT.distance>=30);
});

test('quality modes keep detail sharp and fluid mode GPU-bounded',()=>{
 const quality=createQualityController('detail');
 assert.equal(quality.ratio(1000,700,2),1.5);
 quality.setMode('fluid');
 assert.ok(quality.ratio(1440,900,3)<=1);
 quality.setMode('auto');
 const before=quality.scale;
 quality.sample(20,1.1);assert.equal(quality.sample(20,1.1),true);
 assert.ok(quality.scale<before);
});

test('Paris uses shorter LOD ranges and lighter materials on weak mobile hardware',()=>{
 const weak=parisRenderBudget(2,4),balanced=parisRenderBudget(4,6),ultra=parisRenderBudget(8,8);
 assert.ok(weak.detail<balanced.detail&&balanced.detail<ultra.detail);
 assert.ok(weak.visible<balanced.visible&&balanced.visible<ultra.visible);
 assert.ok(weak.eiffelDetail<balanced.eiffelDetail&&balanced.eiffelDetail<ultra.eiffelDetail);
 assert.ok(weak.anisotropy<balanced.anisotropy&&balanced.anisotropy<ultra.anisotropy);
 assert.equal(weak.normalMap,false);
 assert.equal(balanced.normalMap,true);
 assert.equal(ultra.normalMap,true);
});

test('regional districts reduce detail, material and shadow cost on weak hardware',()=>{
 const weak=regionalRenderBudget(2,4),balanced=regionalRenderBudget(4,6),ultra=regionalRenderBudget(8,8);
 assert.ok(weak.detail<balanced.detail&&balanced.detail<ultra.detail);
 assert.ok(weak.visible<balanced.visible&&balanced.visible<ultra.visible);
 assert.equal(weak.normalMap,false);
 assert.equal(weak.castShadow,false);
 assert.equal(balanced.normalMap,true);
 assert.equal(ultra.castShadow,true);
});

test('vegetation budgets remove wind and shadows on weak hardware and scale meadow density',()=>{
 const weakFlora=floraRenderBudget(2,4),balancedFlora=floraRenderBudget(4,6),ultraFlora=floraRenderBudget(8,8);
 assert.equal(weakFlora.castShadow,false);assert.equal(weakFlora.wind,false);
 assert.equal(balancedFlora.castShadow,true);assert.equal(balancedFlora.wind,true);
 assert.equal(ultraFlora.castShadow,true);assert.equal(ultraFlora.wind,true);
 const weakMeadow=meadowRenderBudget(2,4),balancedMeadow=meadowRenderBudget(4,6),ultraMeadow=meadowRenderBudget(8,8);
 assert.equal(weakMeadow.density,.55);assert.equal(balancedMeadow.density,.82);assert.equal(ultraMeadow.density,1);
});

test('France vertical slice is canonically Celiane and Justice',()=>{
 assert.match(CHAPTERS.france.resident,/Céliane/);
 assert.match(CHAPTERS.france.title,/Justice/);
 assert.equal(cardById.C002.name,'Céliane — Justice');
 assert.equal(cardById.C213.name,'Fragment de Justice');
 assert.match(cardById.C165.power,/Justice/);
 assert.equal(isCelianeResident('woman','#7bbdff'),true);
 assert.equal(isCelianeResident('woman','#577b78'),false);
 assert.equal(isCelianeResident('artisan','#7bbdff'),false);
 const objective=chapterObjective(blankSave(),'france');
 assert.match(objective.title,/Céliane/);
});

test('first France memory grants the real Justice fragment through the existing save engine',()=>{
 const before=blankSave(),after=beacon(before,'france:0');
 assert.equal(after.collection.C213,1);
 assert.ok(after.beacons.includes('france:0'));
 assert.equal(after.xp,before.xp+45);
 assert.equal(after.shards,before.shards+15);
});
