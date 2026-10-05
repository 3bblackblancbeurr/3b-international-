import test from 'node:test';
import assert from 'node:assert/strict';
import {CITE_ISLANDS,CITE_BRIDGES,citeSurfaceDistance} from '../src/world/hub/platform-topology.js';
import {createHubPlatform} from '../src/world/hub/platform-scene.js';
import {HUB_SCALE,HUB_PLATFORM,safePlatformPosition,platformPortal} from '../src/world/hub/platform-layout.js';
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
  const start={x:30*HUB_SCALE,z:20*HUB_SCALE};let p=start;
  assert.ok(citeSurfaceDistance(start.x/HUB_SCALE,start.z/HUB_SCALE)<-1,'walking begins inside the revised coast');
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

test('coastal foundations stay below the pedestrian deck and cannot hide the character',async()=>{
 const THREE=await import('three'),hub=createHubPlatform(blankSave());hub.root.updateMatrixWorld(true);
 try{for(const p of [{x:0,z:40},{x:40,z:0}]){
  const ray=new THREE.Raycaster(new THREE.Vector3(p.x*HUB_SCALE,20,p.z*HUB_SCALE),new THREE.Vector3(0,-1,0));
  const hits=ray.intersectObject(hub.root,true).filter(h=>!h.object.material.transparent);
  assert.ok(hits.length);assert.ok(hits[0].point.y<.15,`No foundation protrudes through the road at ${JSON.stringify(p)}`);
 }}finally{hub.dispose();}
});

 test('country gates follow the reference compass without changing destination identities',()=>{
  const france=platformPortal(0),italie=platformPortal(1),estonie=platformPortal(2),turquie=platformPortal(3),algerie=platformPortal(4),tunisie=platformPortal(5),maroc=platformPortal(6),espagne=platformPortal(7);
  assert.ok(france.x<0&&france.z<0);assert.ok(italie.x>0&&Math.abs(italie.z)<italie.x*.1);assert.ok(estonie.z<0&&Math.abs(estonie.x)<-estonie.z*.1);assert.ok(turquie.x>0&&turquie.z<0);assert.ok(algerie.z>0&&algerie.x>=0&&algerie.x<algerie.z*.5);assert.ok(tunisie.x>0&&tunisie.z>0);assert.ok(maroc.x<0&&maroc.z>0);assert.ok(espagne.x<0&&Math.abs(espagne.z)<-espagne.x*.15);
 });
