import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {civicGlazingGeometry,civicGlazingFrameGeometry} from '../src/world/hub/platform-architecture.js';

test('civic glazing reveals have depth, clear centres and follow both outward tapered facade normals',()=>{
 const material=new THREE.MeshBasicMaterial();
 for(const side of [-1,1]){
  const pane=civicGlazingGeometry(10,5,20,[[0,1],[1,.7]],8,side),geometry=civicGlazingFrameGeometry(pane),mesh=new THREE.Mesh(geometry,material),ray=new THREE.Raycaster();mesh.updateMatrixWorld(true);
  try{
   const p=pane.attributes.position,centre=new THREE.Vector3();for(let i=0;i<4;i++)centre.add(new THREE.Vector3().fromBufferAttribute(p,i));centre.multiplyScalar(.25);const normal=new THREE.Vector3().fromBufferAttribute(pane.attributes.normal,0);
   ray.set(centre.clone().addScaledVector(normal,1),normal.clone().negate());assert.ok(ray.intersectObject(mesh).length>0,'central mullion is a real bronze volume');
   centre.x+=.4;ray.set(centre.clone().addScaledVector(normal,1),normal.clone().negate());assert.equal(ray.intersectObject(mesh).length,0,'pane remains open between reveal and mullion');
   assert.ok(geometry.attributes.position.array.every(Number.isFinite));
  }finally{pane.dispose();geometry.dispose();}
 }
 material.dispose();
});
