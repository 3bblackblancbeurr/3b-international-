import test from 'node:test';
import assert from 'node:assert/strict';
import {createMovementFrame,followMovement,angleDelta,viewBearing} from '../src/world/camera-follow.js';
import {DEFAULT_ORBIT,orbitView,restoreOrbit} from '../src/world/orbit.js';
import {blankSave} from '../src/world/rules.js';
import {applyWorldAction,advanceBattle} from '../src/world/engine.js';
import {threatKind,createCombatTelegraph} from '../src/world/combat-telegraph.js';
import {createTerrainField,landmarkSightline,segmentDistance} from '../src/world/terrain.js';
import {COUNTRIES} from '../src/world/catalog.js';
import {buildingDimensions} from '../src/world/building-scale.js';

test('a held sideways gesture remains straight while the camera settles behind it',()=>{
 for(const rate of [30,60,120]){
  const frame=createMovementFrame();let orbit={...DEFAULT_ORBIT},x=0,z=0;
  for(let i=0;i<rate*3;i++){const v=frame.resolve(1,0,orbit.yaw);x+=v.x/rate;z+=v.z/rate;orbit=followMovement(orbit,v.x,v.z,1/rate);}
  assert.ok(Math.abs(x-3)<1e-8);assert.ok(Math.abs(z)<1e-8,'no camera-induced steering spiral');assert.ok(Math.abs(angleDelta(orbit.yaw,-Math.PI/2))<.01);
  frame.resolve(0,0,orbit.yaw);const forward=frame.resolve(0,-1,orbit.yaw);assert.ok(forward.x>.99,'next gesture uses the newly visible view');
 }
});
test('follow takes the short rotation, preserves framing, and respects free look and stopped movement',()=>{
 const orbit={yaw:Math.PI-.03,pitch:.77,distance:36};
 const to=-Math.PI+.03,v={x:-Math.sin(to),z:-Math.cos(to)};
 const next=followMovement(orbit,v.x,v.z,1/60);assert.ok(next.yaw>orbit.yaw);assert.equal(next.pitch,orbit.pitch);assert.equal(next.distance,36);
 for(const options of [{enabled:false},{manual:true},{quietFor:1.3}])assert.deepEqual(followMovement(orbit,1,0,.1,options),orbit);
 assert.deepEqual(followMovement(orbit,0,0,.1),orbit);
 assert.ok(Math.abs(angleDelta(orbit.yaw,followMovement(orbit,1,0,.25).yaw))<=1.9*.25+1e-10);
 assert.equal(viewBearing({x:0,z:12},{x:0,z:0}),0);
});
test('country buildings vary in volume without reducing usable door dimensions',()=>{
 for(const {id} of COUNTRIES){const dims=Array.from({length:10},(_,i)=>buildingDimensions(id,i));assert.ok(new Set(dims.map(d=>`${d.width}:${d.depth}:${d.floors}`)).size>=4,id);assert.ok(dims.every(d=>d.doorHeight>3.8&&d.doorWidth>=2.5&&d.height>=5.6));}
});
test('looking up reveals the skyline above the player without entering terrain or changing zoom',()=>{
 const orbit={yaw:.8,pitch:-.3,distance:36},view=orbitView(orbit,{x:0,z:0},0,false,()=>7);
 assert.ok(view.position.y>=8.2);assert.ok(view.target.y>view.position.y);
 assert.ok(Math.abs(Math.hypot(view.position.x-view.target.x,view.position.y-view.target.y,view.position.z-view.target.z)-36)<1e-8);
 assert.equal(restoreOrbit({yaw:1,pitch:.5,distance:36}).pitch,DEFAULT_ORBIT.pitch);
 assert.equal(restoreOrbit({yaw:1,pitch:.5,distance:36}).distance,36);
 assert.equal(restoreOrbit({version:2,yaw:1,pitch:.5,distance:36}).pitch,.5);
 assert.equal(restoreOrbit({yaw:1,pitch:.65,distance:36}).pitch,.65);
});
test('each country keeps an open landmark sightline for buildings and new vegetation',()=>{
 for(const {id} of COUNTRIES){const field=createTerrainField(id,blankSave()),line=landmarkSightline(id);assert.ok(field.buildings.length>=12,id+' retains a town');for(const b of field.buildings)assert.ok(segmentDistance(b.x,b.z,line.a,line.b)>Math.hypot(b.width,b.depth)/2+4);for(let i=0;i<=10;i++){const t=i/10;assert.ok(field.protectedPoint(line.a.x+(line.b.x-line.a.x)*t,line.a.z+(line.b.z-line.a.z)*t),id);}}
});
test('telegraphs expose the next actual intent and stop after victory or during impacts',()=>{
 const s=applyWorldAction(applyWorldAction(blankSave(),{type:'visit',region:'france'}),{type:'patrol'}),e=s.adventure.encounter;
 assert.equal(threatKind(e),'strike');const next=advanceBattle(e,'strike');assert.equal(next.intent,'rempart');assert.equal(threatKind(next),'shield');assert.equal(threatKind({...next,result:'victory'}),null);
 const view=createCombatTelegraph(),hero={x:0,y:0,z:4},enemy={x:0,y:0,z:0};view.update(e,0,hero,enemy);assert.equal(view.root.visible,true);view.update(e,.2,hero,enemy,true);assert.equal(view.root.visible,false);view.dispose();
 const withdrawn=applyWorldAction(s,{type:'leave'});assert.equal(withdrawn.adventure.encounter,null);assert.equal(withdrawn.xp,s.xp);assert.equal(withdrawn.shards,s.shards);assert.deepEqual(withdrawn.collection,s.collection);
});
