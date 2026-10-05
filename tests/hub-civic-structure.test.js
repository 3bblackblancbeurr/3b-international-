import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createHubPlatform} from '../src/world/hub/platform-scene.js';
import {HUB_SCALE,HUB_PLATFORM} from '../src/world/hub/platform-layout.js';
import {CITE_PROMENADES,CITE_CONNECTORS,citeSurfaceDistance} from '../src/world/hub/platform-topology.js';
import {civicArchGeometry} from '../src/world/hub/civic-structure.js';
import {civicShaftGeometry} from '../src/world/hub/platform-architecture.js';
import {findPath} from '../src/world/navigation.js';
import {blankSave,moveWithCollision} from '../src/world/rules.js';
import {obstacleDistance} from '../src/world/collision.js';

test('built outer arcade has reachable dry decks and preserves the real water gap',()=>{
 const hub=createHubPlatform(blankSave());hub.root.updateMatrixWorld(true);
 try{
  assert.equal(CITE_PROMENADES.length,2);assert.equal(CITE_CONNECTORS.filter(span=>span.id.startsWith('horizon-causeway-')).length,8);
  assert.equal(CITE_CONNECTORS.filter(span=>span.id.startsWith('country-causeway-')).length,8);assert.equal(CITE_CONNECTORS.filter(span=>span.id.startsWith('dock-')).length,5);
  assert.ok(citeSurfaceDistance(160*Math.cos(Math.PI/8),160*Math.sin(Math.PI/8))>0,'water between districts and outer arcade stays water');
  for(let i=0;i<8;i++){
   const a=(i+.35)*Math.PI/4,p={x:Math.cos(a)*177.4*HUB_SCALE,z:Math.sin(a)*177.4*HUB_SCALE};
   const path=findPath(HUB_PLATFORM.spawn,p,hub.collisions,HUB_PLATFORM.walkRadius);assert.ok(path.length,'arcade sector '+i);assert.ok(Math.hypot(path.at(-1).x-p.x,path.at(-1).z-p.z)<1);
   const hit=new THREE.Raycaster(new THREE.Vector3(p.x,30,p.z),new THREE.Vector3(0,-1,0)).intersectObject(hub.ground)[0];assert.ok(hit);assert.ok(Math.abs(hit.point.y)<.001);
  }
 }finally{hub.dispose();}
});

test('civic solid faces point outward and vaults stay below pedestrians',()=>{
 const arch=civicArchGeometry(),shaft=civicShaftGeometry(10,4,30,[[0,1],[.7,1],[1,.72]]),material=new THREE.MeshBasicMaterial();
 try{
  const a=new THREE.Mesh(arch,material),s=new THREE.Mesh(shaft,material);a.updateMatrixWorld();s.updateMatrixWorld();
  const above=new THREE.Raycaster(new THREE.Vector3(0,10,0),new THREE.Vector3(0,-1,0)).intersectObject(a)[0];assert.ok(above);assert.ok(above.point.y<-.9);assert.ok(above.face.normal.y>0);
  const top=new THREE.Raycaster(new THREE.Vector3(0,40,0),new THREE.Vector3(0,-1,0)).intersectObject(s)[0];assert.ok(top);assert.equal(top.point.y,30);assert.ok(top.face.normal.y>0);
  const front=new THREE.Raycaster(new THREE.Vector3(0,10,-10),new THREE.Vector3(0,0,1)).intersectObject(s)[0];assert.ok(front);assert.ok(front.face.normal.z<0);
  assert.ok(arch.attributes.uv&&shaft.attributes.uv,'solid civic geometry can batch with existing PBR material resources');
 }finally{arch.dispose();shaft.dispose();material.dispose();}
});

test('tower lift selects all six actual raycastable floors with bounded movement, then returns ground control',()=>{
 const hub=createHubPlatform(blankSave());hub.root.updateMatrixWorld(true);
 try{
  assert.equal(hub.liftFloors.length,6);assert.equal(hub.liftItems[0].destinations.length,7);
  assert.deepEqual(hub.liftFloors.map(floor=>floor.id),['heritage_gallery','council_eight','living_maps','city_observatory','circle_chamber','horizon_belvedere']);
  const lift=hub.liftItems[0];assert.ok(hub.collisions.every(c=>obstacleDistance(lift,c)>1.25),'ground lift approach clears real shelf and wall');
  const route=findPath(HUB_PLATFORM.spawn,lift,hub.collisions,HUB_PLATFORM.walkRadius);assert.ok(route.length);assert.ok(Math.hypot(route.at(-1).x-lift.x,route.at(-1).z-lift.z)<.01,'lift reached through ground hall door');
  for(const floor of hub.liftFloors){
   const selected=hub.setTowerFloor(floor.index);assert.equal(selected.id,floor.id);assert.equal(hub.height(floor.x,floor.z),floor.y);
   const colliders=hub.obstaclesForTowerFloor();assert.equal(colliders.length,2);assert.ok(colliders.every(c=>c.enabled!==false));assert.ok(colliders.every(c=>obstacleDistance(floor,c)>1.25),'lift landing stays clear');
   const hit=new THREE.Raycaster(new THREE.Vector3(floor.x,floor.y+.3,floor.z),new THREE.Vector3(0,-1,0)).intersectObject(hub.root,true).find(h=>!h.object.material.transparent);assert.ok(hit);assert.ok(Math.abs(hit.point.y-floor.y)<.001,'real solid floor matches movement height');
   let p={x:floor.x,z:floor.z};for(let i=0;i<150;i++)p=moveWithCollision(p,.5,0,colliders,HUB_PLATFORM.walkRadius);assert.ok(Math.abs(p.x-floor.x)<floor.width/2-1.2,'upper floor cannot spill over its edge');
  }
  hub.setTowerFloor(null);assert.equal(hub.towerFloor,null);assert.equal(hub.height(0,-64.6),0);assert.deepEqual(hub.obstaclesForTowerFloor(),[]);assert.ok(hub.collisions.filter(c=>c.id?.startsWith('tower-display-')).every(c=>c.enabled===false));
 }finally{hub.dispose();}
});
