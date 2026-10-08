import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCivilianRoutes,civilianRoutePoint,civilianRoutine,nearbyCivilianRoutes} from '../src/world/ambient-civilian-routes.js';
import {createAmbientCrowd} from '../src/world/ambient-crowd.js';
import {createHubPlatform} from '../src/world/hub/platform-scene.js';
import {HUB_SCALE} from '../src/world/hub/platform-layout.js';
import {citeSurfaceDistance} from '../src/world/hub/platform-topology.js';
import {obstacleDistance} from '../src/world/collision.js';
import {blankSave} from '../src/world/rules.js';
import {loadShippedCrowdFixture} from './crowd-glb-fixture.js';

test('civilian routes use the real city decks and yield to its physical buildings and furniture',()=>{
 const city=createHubPlatform(blankSave());
 try{
  const routes=createCivilianRoutes([{type:'hubBuilding'}],{obstacles:city.collisions});
  assert.ok(routes.length>=12);assert.ok(routes.some(route=>route.kind==='district'));assert.ok(routes.some(route=>route.kind==='promenade'));assert.ok(routes.some(route=>route.kind==='horizon'));
  for(const route of routes)for(let i=0;i<=40;i++){
   const p=civilianRoutePoint(route,i/40);assert.ok(citeSurfaceDistance(p.x/HUB_SCALE,p.z/HUB_SCALE)<0,'resident remains above a deck');
   assert.ok(city.collisions.every(o=>obstacleDistance(p,o)>.5),'resident clears furniture and architecture');
  }
 }finally{city.dispose();}
});

test('civilian routines walk, pause to breathe and return without teleporting at a turnaround',()=>{
 const agent={route:{from:{x:0,z:0},to:{x:20,z:0},length:20},speed:1,pause:4,phase:0,activity:'looking'};
 const walking=civilianRoutine(agent,10),stopped=civilianRoutine(agent,22),returning=civilianRoutine(agent,30);
 assert.equal(walking.activity,'walking');assert.equal(walking.gait,1);assert.equal(stopped.activity,'looking');assert.equal(stopped.speed,0);assert.equal(stopped.x,20);assert.equal(returning.direction,-1);
 for(const boundary of [20,24,44,48]){const a=civilianRoutine(agent,boundary-.001),b=civilianRoutine(agent,boundary+.001);assert.ok(Math.hypot(a.x-b.x,a.z-b.z)<.01);}
 const still=civilianRoutine(agent,200,false);assert.equal(still.gait,0);assert.equal(still.x,0);
});

test('visible civilians keep four draw calls and the attribute and animation memory budgets through pauses',async()=>{
 const root=new THREE.Group(),crowd=createAmbientCrowd(root,[{type:'hubBuilding'}],{modelAsset:await loadShippedCrowdFixture(),modelLibrary:{load:()=>loadShippedCrowdFixture(3)},viewport:1280,deviceMemory:8,mode:'detail'});await crowd.ready;
 try{
  for(const time of [0,20,80,160,300]){crowd.tick(time,{x:0,z:0},time*1000);assert.ok(crowd.diagnostics.visible>0);assert.ok(crowd.diagnostics.drawCalls<=4);}
  assert.ok(crowd.diagnostics.routes>=24);assert.equal(crowd.diagnostics.civilian,true);
  for(const model of crowd.diagnostics.models){assert.equal(model.idleFrames,2);assert.ok(model.animationBytes<=2*1024*1024);}
  for(const mesh of root.children[0].children){const locations=Object.values(mesh.geometry.attributes).reduce((sum,a)=>sum+Math.ceil(a.itemSize/4),0)+4;assert.ok(locations<=16);}
 }finally{crowd.dispose();}
});

test('denser mobile and desktop crowds stay clear of the actual city through complete civilian routines',async()=>{
 const city=createHubPlatform(blankSave()),male=await loadShippedCrowdFixture(),female=await loadShippedCrowdFixture(3),matrix=new THREE.Matrix4(),point=new THREE.Vector3();
 try{
  for(const [coarsePointer,count] of [[true,32],[false,96]]){
   const root=new THREE.Group(),crowd=createAmbientCrowd(root,[{type:'hubBuilding'}],{mode:'auto',coarsePointer,viewport:1280,deviceMemory:8,obstacles:city.collisions,groundY:city.height,modelAsset:male,modelLibrary:{load:async()=>female}});await crowd.ready;
   try{
    assert.equal(crowd.diagnostics.count,count);
    for(const time of [0,30,60,120,180,300]){
     crowd.tick(time,{x:0,z:0},time*1000);assert.ok(crowd.diagnostics.visible>0);assert.ok(crowd.diagnostics.drawCalls<=4);
     for(const mesh of root.children[0].children)for(let i=0;i<mesh.count;i++){
      mesh.getMatrixAt(i,matrix);point.setFromMatrixPosition(matrix);
      assert.ok(citeSurfaceDistance(point.x/HUB_SCALE,point.z/HUB_SCALE)<0,'civilian feet remain on a public deck');
      assert.ok(city.collisions.every(o=>obstacleDistance(point,o)>.35),'civilian clears the city furniture and walls');
      assert.ok(Math.abs(point.y-city.height(point.x,point.z))<.001,'civilian follows the physical deck height');
     }
    }
    crowd.setQuality('fluid');assert.equal(crowd.diagnostics.count,coarsePointer?16:36,'fluid mode preserves its lower rendering budget');
   }finally{crowd.dispose();}
  }
 }finally{city.dispose();}
});

test('active districts reuse real, safe routes nearest the visitor instead of empty distant streets',async()=>{
 const near={id:'near',from:{x:10,z:-10},to:{x:10,z:10},length:20},far={id:'far',from:{x:320,z:-20},to:{x:320,z:20},length:40};
 const ranked=nearbyCivilianRoutes([far,near],{x:5,z:0},70,2);
 assert.equal(ranked[0],near);
 assert.deepEqual(nearbyCivilianRoutes([far,near],{x:320,z:0},70,2),[far]);
 assert.deepEqual(nearbyCivilianRoutes([far,near],{x:10000,z:10000},10,2).length,2,'remote position keeps nearest real routes as fallback');
 const male=await loadShippedCrowdFixture(),root=new THREE.Group(),crowd=createAmbientCrowd(root,[{type:'hubBuilding'}],{modelAsset:male,mode:'fluid',coarsePointer:true,viewport:844,deviceMemory:4,groundY:()=>0});
 await crowd.ready;
 try{
  crowd.tick(0,{x:0,z:0},0);assert.ok(crowd.diagnostics.visible>0);
  crowd.tick(40,{x:280,z:0},40000);crowd.tick(41,{x:280,z:0},41000);
  assert.ok(crowd.diagnostics.visible>0,'a player visiting another quarter finds real walkers nearby');
  assert.equal(crowd.diagnostics.count,16,'the mobile fluid character budget is unchanged');
  assert.ok(crowd.diagnostics.drawCalls<=4,'no additional CPU/GPU draw batches');
 }finally{crowd.dispose();}
});
