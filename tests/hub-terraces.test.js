import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {CITE_TERRACES,terraceWorldHeight} from '../src/world/hub/terraces.js';
import {HUB_SCALE,HUB_PLATFORM} from '../src/world/hub/platform-layout.js';
import {createHubPlatform} from '../src/world/hub/platform-scene.js';
import {blankSave} from '../src/world/rules.js';
import {findPath} from '../src/world/navigation.js';
import {obstacleDistance} from '../src/world/collision.js';
const point=(t,a,c=0)=>({x:(t.x+Math.cos(t.angle)*a-Math.sin(t.angle)*c)*HUB_SCALE,z:(t.z+Math.sin(t.angle)*a+Math.cos(t.angle)*c)*HUB_SCALE});
test('eight lookout ramps are reachable and rendered at the same height used by movement',()=>{
 const hub=createHubPlatform(blankSave());hub.root.updateMatrixWorld(true);
 try{for(const t of CITE_TERRACES){
  const target=point(t,6),route=findPath(HUB_PLATFORM.spawn,target,hub.collisions,HUB_PLATFORM.walkRadius);assert.ok(route.length,t.id);assert.ok(Math.hypot(route.at(-1).x-target.x,route.at(-1).z-target.z)<1,t.id);
  for(const a of [-9,-6,0,4,8]){
   const p=point(t,a),ray=new THREE.Raycaster(new THREE.Vector3(p.x,50,p.z),new THREE.Vector3(0,-1,0)),hits=ray.intersectObject(hub.ground);
   assert.ok(hits.length,t.id);assert.ok(Math.abs(hits[0].point.y-hub.height(p.x,p.z))<.001,`${t.id}: rendered floor agrees with movement`);
  }
  let previous=0;for(let a=-10;a<=8;a+=.1){const p=point(t,a),height=terraceWorldHeight(p.x,p.z);assert.ok(Math.abs(height-previous)<.05,'no height teleport along ramp');previous=height;}
  const rail=hub.collisions.find(o=>o.id===`${t.id}-rail-1--3`);assert.ok(obstacleDistance(point(t,-3,3.3),rail)<0,'side railing blocks walking through');
 }}finally{hub.dispose();}
});
