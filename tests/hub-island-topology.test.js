import test from 'node:test';
import assert from 'node:assert/strict';
import {CITE_ISLANDS,CITE_BRIDGES,citeSurfaceDistance} from '../src/world/hub/platform-topology.js';
import {createHubPlatform} from '../src/world/hub/platform-scene.js';
import {HUB_SCALE,HUB_PLATFORM,safePlatformPosition} from '../src/world/hub/platform-layout.js';
import {blankSave} from '../src/world/rules.js';
import {moveWithCollision} from '../src/world/rules.js';
import {worldRuntimeItems} from '../src/world/runtime-items.js';
import {findPath} from '../src/world/navigation.js';
import {obstacleDistance} from '../src/world/collision.js';

test('water gaps block walking; bridges and island centres remain actual ground',()=>{
 assert.ok(CITE_ISLANDS.length>20);assert.equal(CITE_BRIDGES.length,8);
 for(const p of [{x:42,z:20},{x:42,z:-20}])assert.ok(citeSurfaceDistance(p.x,p.z)>0);
 const hub=createHubPlatform(blankSave());try{
  const water=hub.collisions.find(o=>o.id==='cite-water-boundary');
  assert.ok(obstacleDistance({x:42*HUB_SCALE,z:20*HUB_SCALE},water)<0);
  const start={x:35*HUB_SCALE,z:20*HUB_SCALE};let p=start;
  for(let i=0;i<150;i++)p=moveWithCollision(p,.12,0,[water],HUB_PLATFORM.walkRadius);
  assert.ok(citeSurfaceDistance(p.x/HUB_SCALE,p.z/HUB_SCALE)<0,'cannot walk into the sea');
  assert.deepEqual(safePlatformPosition({x:42*HUB_SCALE,z:20*HUB_SCALE}),HUB_PLATFORM.spawn);
 }finally{hub.dispose();}
});
test('new refuge and arena creatures are reachable without changing reward state',()=>{
 const save=blankSave(),before=JSON.stringify(save),hub=createHubPlatform(save);
 try{for(const item of worldRuntimeItems('hub',save).filter(i=>i.type==='hubCreature')){
  const path=findPath(HUB_PLATFORM.spawn,item,hub.collisions,HUB_PLATFORM.walkRadius);assert.ok(path.length,item.id);assert.ok(Math.hypot(path.at(-1).x-item.x,path.at(-1).z-item.z)<item.range);
 }assert.equal(JSON.stringify(save),before);}finally{hub.dispose();}
});
