import test from 'node:test';import assert from 'node:assert/strict';
import {CITE_ISLANDS,citeIslandRadius} from '../src/world/hub/platform-topology.js';
import {cliffWaterlineRadius,islandCliffGeometry} from '../src/world/hub/island-cliffs.js';
import {Mesh,MeshBasicMaterial,Raycaster,Vector3} from 'three';
import {citeCoastalDistance,citeCoastalFoam} from '../src/world/hub/coastal-foam.js';
import {createPremiumWater} from '../src/world/premium-water.js';

test('sea foam follows the submerged cliff contour rather than the wider deck rim',()=>{
 const island=CITE_ISLANDS.find(i=>i.id==='gate-2'),a=0,radius=cliffWaterlineRadius(island,a);
 const x=island.x+radius,z=island.z;
 assert.ok(Math.abs(citeCoastalDistance(x,z))<.001);
 assert.ok(citeCoastalFoam(x+1,z)>0);
 assert.equal(citeCoastalFoam(island.x+citeIslandRadius(island,a)+7,z),0);
 assert.equal(citeCoastalFoam(900,900),0);
 const impactAngle=Math.atan2(island.z,island.x),impactR=citeIslandRadius(island,impactAngle)+1.65;
 assert.ok(citeCoastalFoam(island.x+Math.cos(impactAngle)*impactR,island.z+Math.sin(impactAngle)*impactR)>.4);
});
test('contact foam uses the rendered cliff triangles at the actual sea level for every raised island',()=>{
 const material=new MeshBasicMaterial();
 try{for(const island of CITE_ISLANDS){const geometry=islandCliffGeometry(island),cliff=new Mesh(geometry,material);cliff.updateMatrixWorld();
  try{for(const angle of [.17,1.21,3.71,5.83]){
   const c=Math.cos(angle),s=Math.sin(angle),ray=new Raycaster(new Vector3(c*island.r*1.5,-18-(island.baseY||0),s*island.r*1.5),new Vector3(-c,0,-s)),hit=ray.intersectObject(cliff)[0];
   assert.ok(hit,island.id+' has solid shoreline');
   assert.ok(Math.abs(Math.hypot(hit.point.x,hit.point.z)-cliffWaterlineRadius(island,angle))<.001,island.id+' foam follows the actual triangulation');
  }}finally{geometry.dispose();}
 }}finally{material.dispose();}
});
test('baked sea contact mask stays bounded and retains the existing lake contact API',()=>{
 const owned=[],water=createPremiumWater({lake:{x:0,z:0,r:245},ocean:true,owned});
 water.setFoamMask(citeCoastalFoam);const texture=water.material.uniforms.contactFoam.value;
 assert.equal(texture.image.width,256);assert.ok(texture.image.data.some(n=>n>0));
 assert.equal(texture.image.data[0],0);
 const lake=createPremiumWater({lake:{x:0,z:0,r:16},owned});lake.setFoamContacts([{x:0,z:0,r:3}]);
 assert.equal(lake.material.uniforms.contactFoam.value.image.width,128);
 water.disposeReflection();lake.disposeReflection();owned.forEach(a=>a.dispose());
});
