import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {COUNTRIES} from '../src/world/catalog.js';
import {HUB_SCALE} from '../src/world/hub/platform-layout.js';
import {referenceGateDistrictLayout,addReferenceGateDistricts} from '../src/world/hub/reference-gate-districts.js';
import {obstacleDistance} from '../src/world/collision.js';

const gates=COUNTRIES.map((country,i)=>{const a=i*Math.PI/4;return{country:country.id,x:Math.cos(a)*216,z:Math.sin(a)*216,radius:40};});

test('eight distinct authored gate ensembles leave a continuous public radial passage',()=>{
 const layout=referenceGateDistrictLayout(gates);assert.equal(layout.length,8);assert.equal(new Set(layout.map(r=>r.profile.style)).size,8);
 for(const region of layout){assert.equal(region.buildings.length,12);
  for(const b of region.buildings){
   assert.ok(Math.abs(b.localX)-b.width/2>8.5,b.country+' radial passage');
   for(const sideX of [-1,1])for(const sideZ of [-1,1])assert.ok(Math.hypot(b.localX+sideX*b.width/2,b.localZ+sideZ*b.depth/2)<region.radius-.8,b.country+' land footprint');
  }
 }
});

test('gate city meshes, market approaches and map footprints use the same physical positions',()=>{
 const root=new THREE.Group(),owned=[],box=new THREE.BoxGeometry(1,1,1),collisions=[],cameraSolids=[];
 try{
  const city=addReferenceGateDistricts({root,owned,box,collisions,cameraSolids,gates});root.updateMatrixWorld(true);
  assert.equal(city.count,96);assert.equal(city.districts,8);assert.equal(city.mapSites.length,208);assert.equal(city.worldMapSites.length,208);
  assert.equal(collisions.length,208);assert.equal(cameraSolids.length,208);assert.equal(city.anchors.length,16);
  for(const a of city.anchors)assert.ok(collisions.every(c=>obstacleDistance(a,c)>.74),'market approach '+a.id);
  for(let i=0;i<city.mapSites.length;i++){
   const local=city.mapSites[i],world=city.worldMapSites[i];assert.equal(world.x,local.x*HUB_SCALE);assert.equal(world.z,local.z*HUB_SCALE);assert.equal(world.width,local.width*HUB_SCALE);assert.equal(world.height,local.height*1.5);
   assert.equal(collisions[i].x,local.x);assert.equal(collisions[i].z,local.z);assert.equal(collisions[i].width,local.width);
  }
  assert.ok(city.group.children.length<=23,'instancing across all eight districts');
  const camera=new THREE.PerspectiveCamera();camera.position.set(216,7,0);camera.updateMatrixWorld(true);city.updateView(camera);const near=city.group.children.map(m=>m.count);
  camera.position.set(3000,7,3000);camera.updateMatrixWorld(true);city.updateView(camera);assert.ok(city.group.children.some((m,i)=>m.count===0&&near[i]>0));
  camera.position.set(216,7,0);camera.updateMatrixWorld(true);city.updateView(camera);assert.deepEqual(city.group.children.map(m=>m.count),near);
 }finally{box.dispose();owned.forEach(o=>o.dispose());}
});

test('the built perimeter district footprints rest on the real expanded island polygons',async()=>{
 const {citeSurfaceDistance}=await import('../src/world/hub/platform-topology.js');
 for(const region of referenceGateDistrictLayout())for(const b of region.buildings){
  for(const sx of [-1,1])for(const sz of [-1,1]){
   const dx=sx*(b.width+.8)/2,dz=sz*(b.depth+.8)/2;
   const x=b.x+Math.cos(b.rotation)*dx+Math.sin(b.rotation)*dz,z=b.z-Math.sin(b.rotation)*dx+Math.cos(b.rotation)*dz;
   assert.ok(citeSurfaceDistance(x,z)<-.20,b.country+' house '+b.index+' coastline corner');
  }
 }
});

test('new gate courtyards retain room for the twelve physical reference landmark facilities',async()=>{
 const {referenceLandmarkPlans}=await import('../src/world/hub/reference-landmarks.js');
 const corners=b=>[-1,1].flatMap(x=>[-1,1].map(z=>{const a=b.rotation||0,dx=x*b.width/2,dz=z*b.depth/2;return{x:b.x+Math.cos(a)*dx+Math.sin(a)*dz,z:b.z-Math.sin(a)*dx+Math.cos(a)*dz};}));
 const overlap=(a,b)=>{
  const ap=corners(a),bp=corners(b);
  for(const o of [a,b])for(const theta of [o.rotation||0,(o.rotation||0)+Math.PI/2]){
   const co=Math.cos(theta),si=Math.sin(theta),pa=ap.map(p=>p.x*co-p.z*si),pb=bp.map(p=>p.x*co-p.z*si);
   if(Math.min(Math.max(...pa),Math.max(...pb))-Math.max(Math.min(...pa),Math.min(...pb))<.025)return false;
  }
  return true;
 };
 const root=new THREE.Group(),owned=[],box=new THREE.BoxGeometry(1,1,1),collisions=[];
 try{
  addReferenceGateDistricts({root,owned,box,collisions});
  for(const facility of referenceLandmarkPlans())for(const solid of facility.solids)for(const building of collisions)assert.ok(!overlap(solid,building),facility.site.id+' intersects '+building.id);
 }finally{box.dispose();owned.forEach(o=>o.dispose());}
});

test('shops and monumental homes are grounded on each raised gate platform',()=>{
 const root=new THREE.Group(),owned=[],box=new THREE.BoxGeometry(1,1,1),matrix=new THREE.Matrix4(),position=new THREE.Vector3(),scale=new THREE.Vector3(),q=new THREE.Quaternion();
 try{
  const city=addReferenceGateDistricts({root,owned,box});
  const minimumAt=(x,z)=>{
   let min=Infinity;
   for(const mesh of city.group.children){
    mesh.geometry.computeBoundingBox();
    for(let i=0;i<mesh.count;i++){
     mesh.getMatrixAt(i,matrix);matrix.decompose(position,q,scale);
     if(Math.hypot(position.x-x,position.z-z)<.015)min=Math.min(min,position.y+mesh.geometry.boundingBox.min.y*scale.y);
    }
   }
   return min;
  };
  for(const region of city.layout){
   for(const b of region.buildings)assert.ok(Math.abs(minimumAt(b.x,b.z)-b.baseY)<.005,b.country+' grounded plinth');
   for(const side of [-1,1]){
    const lx=side*11.7*region.scale,lz=-5.5*region.scale,x=region.x+Math.cos(region.angle)*lx+Math.sin(region.angle)*lz,z=region.z-Math.sin(region.angle)*lx+Math.cos(region.angle)*lz;
    assert.ok(Math.abs(minimumAt(x,z)-region.baseY)<.005,region.country+' grounded market');
   }
  }
 }finally{box.dispose();owned.forEach(o=>o.dispose());}
});
