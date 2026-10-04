import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {addCivicBasins,configureCivicPoolWater,CIVIC_BASIN_PROFILE} from '../src/world/hub/civic-basins.js';
import {createPremiumWater} from '../src/world/premium-water.js';

function createFixture(){
 const root=new THREE.Group(),owned=[],collisions=[],water=createPremiumWater({region:'hub',lake:{x:0,z:0,r:16},owned});water.setQuality('medium',{allowPlanarReflection:false});configureCivicPoolWater(water);
 const cylinder=new THREE.CylinderGeometry(1,1,1,32);owned.push(cylinder);const stone=new THREE.MeshStandardMaterial({color:'#8c989b'}),gold=new THREE.MeshStandardMaterial({color:'#cba364'});owned.push(stone,gold);
 const mesh=(geometry,material,x,y,z,sx=1,sy=sx,sz=sx)=>{const object=new THREE.Mesh(geometry,material);object.position.set(x,y,z);object.scale.set(sx,sy,sz);root.add(object);return object;};
 const basin=addCivicBasins({mesh,geo:geometry=>(owned.push(geometry),geometry),cylinder,materials:{stone,gold,water:water.material},collisions,owned});root.updateMatrixWorld(true);
 return {root,basin,water,collisions,dispose(){water.disposeReflection();for(const resource of new Set(owned))resource.dispose();}};
}

function crownHit(wall,angle=0){
 const radius=14.36,ray=new THREE.Raycaster(new THREE.Vector3(wall.position.x+Math.cos(angle)*radius,2,wall.position.z+Math.sin(angle)*radius),new THREE.Vector3(0,-1,0));
 return ray.intersectObject(wall)[0];
}

test('all four stone crowns are visible from above with the real FrontSide material',()=>{
 const f=createFixture();
 try{
  for(const wall of f.basin.walls){
   assert.equal(wall.material.side,THREE.FrontSide);
   for(const angle of [0,.4,Math.PI/2,Math.PI]){
    const hit=crownHit(wall,angle);assert.ok(hit,'the upper stone crown must face the observer');
    assert.ok(Math.abs(hit.point.y-.70)<1e-6,'the ray must reach the crown rather than its underside');
    assert.ok(hit.face.normal.y>.99,'the top face must have an upward normal');
   }
  }
 }finally{f.dispose();}
});

test('the real basin surfaces sit over an opaque bed and retain all four existing collision circles',()=>{
 const f=createFixture();
 try{
  assert.deepEqual(f.collisions,[[48,48],[-48,48],[48,-48],[-48,-48]].map(([x,z])=>({x,z,r:14.8})));
  const ray=new THREE.Raycaster(new THREE.Vector3(),new THREE.Vector3(0,-1,0));
  for(const [index,[x,z]] of CIVIC_BASIN_PROFILE.centers.entries())for(const [dx,dz] of [[0,0],[5,3],[-8,2]]){
   ray.ray.origin.set(x+dx,3,z+dz);const hits=ray.intersectObjects([f.basin.waterSurfaces[index],f.basin.floorSurfaces[index]]);
   assert.ok(hits.length>=2);assert.equal(hits[0].object,f.basin.waterSurfaces[index]);assert.ok(hits[0].point.y>.4);assert.ok(hits.find(hit=>hit.object===f.basin.floorSurfaces[index]).point.y>0);
  }
  for(const wall of f.basin.walls){wall.geometry.computeBoundingBox();const bound=wall.geometry.boundingBox;assert.ok(Math.max(Math.abs(bound.min.x),Math.abs(bound.max.x),Math.abs(bound.min.z),Math.abs(bound.max.z))<14.8);}
 }finally{f.dispose();}
});

test('all shader wave terms remain safely above the paving and bed and below the retaining crown',()=>{
 const f=createFixture(),p=CIVIC_BASIN_PROFILE;
 try{
  const amplitude=f.water.material.uniforms.waveAmp.value,conservative=.395*amplitude;
  const crowns=f.basin.walls.map(wall=>crownHit(wall));assert.ok(crowns.every(Boolean));const lowestCrown=Math.min(...crowns.map(hit=>hit.point.y));
  assert.equal(amplitude,.35);assert.ok(p.waterLevel-conservative>p.floorTop+.10);assert.ok(p.waterLevel-conservative>.25);assert.ok(p.waterLevel+conservative<lowestCrown-.10);
  // Raycast actual displaced CPU geometry at several times and locations. The
  // expression is the shipped water vertex shader, including all three waves.
  const ray=new THREE.Raycaster(new THREE.Vector3(),new THREE.Vector3(0,-1,0));
  for(const time of [0,.5,3,11,60])for(const surface of f.basin.waterSurfaces){
   const geometry=surface.geometry.clone(),position=geometry.attributes.position;
   for(let i=0;i<position.count;i++){
    const x=position.getX(i),y=position.getY(i),large=(Math.sin(x*.095+time*.34)+Math.cos(y*.072-time*.27))*.5,cross=Math.sin(x*.19+y*.14-time*.22)*.42,small=Math.sin(x*.41-y*.33+time*.74)*.18;
    position.setZ(i,(large*.24+cross*.10+small*.055)*amplitude);
   }
   geometry.computeBoundingSphere();const displaced=new THREE.Mesh(geometry,surface.material);displaced.copy(surface,false);displaced.geometry=geometry;displaced.updateMatrixWorld(true);
   ray.ray.origin.set(surface.position.x+5,3,surface.position.z+2);const hit=ray.intersectObject(displaced)[0];assert.ok(hit);assert.ok(hit.point.y>p.floorTop+.10);assert.ok(hit.point.y<lowestCrown-.10);geometry.dispose();
  }
  assert.equal(f.water.material.uniforms.sceneReflection.value,0);assert.equal(f.water.material.uniforms.reflectionReady.value,0);
 }finally{f.dispose();}
});

test('local basin colours are readable while the shared fountain remains calm and asset-free',()=>{
 const f=createFixture();
 try{const u=f.water.material.uniforms;assert.equal(u.deepColor.value.getHexString(),'0d465a');assert.equal(u.shallowColor.value.getHexString(),'286e7b');assert.ok(u.shallowColor.value.g>new THREE.Color('#0d2633').g*2);assert.equal(f.basin.count,4);assert.ok(f.basin.waterSurfaces.every(surface=>surface.material===f.water.material));}finally{f.dispose();}
});
