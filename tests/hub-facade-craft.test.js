import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {facadeArchGeometry,mansardRoofGeometry,northlightRoofGeometry} from '../src/world/hub/facade-craft.js';

test('bevelled masonry arch has a real open middle and substantial stone jambs',()=>{
 const geometry=facadeArchGeometry(),material=new THREE.MeshBasicMaterial(),mesh=new THREE.Mesh(geometry,material),ray=new THREE.Raycaster();mesh.updateMatrixWorld();
 try{
  for(const [x,y,open] of [[0,1.1,true],[-1.0,1.1,false],[1.0,1.1,false],[0,2.7,false]]){
   ray.set(new THREE.Vector3(x,y,2),new THREE.Vector3(0,0,-1));
   assert.equal(ray.intersectObject(mesh).length===0,open,'doorway x='+x+', y='+y);
  }
  geometry.computeBoundingBox();assert.ok(geometry.boundingBox.max.z-geometry.boundingBox.min.z>.2);
 }finally{geometry.dispose();material.dispose();}
});

test('roof shells expose outward surfaces for daylight and shadows from above',()=>{
 const material=new THREE.MeshBasicMaterial();
 for(const geometry of [mansardRoofGeometry(),northlightRoofGeometry()]){
  const mesh=new THREE.Mesh(geometry,material),ray=new THREE.Raycaster();mesh.updateMatrixWorld();
  try{
   for(const [x,z] of [[0,0],[-.35,.15],[.35,-.15]]){
    ray.set(new THREE.Vector3(x,3,z),new THREE.Vector3(0,-1,0));const hits=ray.intersectObject(mesh);assert.ok(hits.length);assert.ok(hits[0].face.normal.y>0,'upward roof normal');
   }
  }finally{geometry.dispose();}
 }
 material.dispose();
});
