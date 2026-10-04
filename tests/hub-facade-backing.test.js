import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createHubPlatform} from '../src/world/hub/platform-scene.js';
import {blankSave} from '../src/world/rules.js';

test('physical glazing remains backed by a facade on each stepped storey',()=>{
 const h=createHubPlatform(blankSave());h.root.updateMatrixWorld(true);
 try{
  const fabric=h.root.getObjectByName('3B · tissu urbain des quartiers');
  const bodies=fabric.children.filter(o=>o.name==='Bâtiments des quartiers');
  const windows=fabric.getObjectByName('Baies vitrées');
  const matrix=new THREE.Matrix4(),world=new THREE.Matrix4(),centre=new THREE.Vector3(),normal=new THREE.Vector3(),ray=new THREE.Raycaster();
  assert.ok(windows.count>100);assert.ok(bodies.length>=2);
  for(let i=0;i<windows.count;i++){
   windows.getMatrixAt(i,matrix);world.multiplyMatrices(windows.matrixWorld,matrix);
   centre.setFromMatrixPosition(world);normal.set(0,0,1).transformDirection(world);
   ray.set(centre.clone().addScaledVector(normal,.75),normal.clone().negate());
   const hit=ray.intersectObjects(bodies,false)[0];
   assert.ok(hit&&hit.distance<1.05,'window '+i+' must have a solid facade immediately behind its glass');
  }
 }finally{h.dispose();}
});
