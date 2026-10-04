import test from 'node:test';import assert from 'node:assert/strict';import * as THREE from 'three';
import {createAmbientCrowd} from '../src/world/ambient-crowd.js';
const items=[{type:'hubBuilding'}],options={mode:'detail',viewport:1280,deviceMemory:8,groundY:()=>7};
test('crowd has grounded shoes, connected heads, instance colours and two shared draws',()=>{
 const root=new THREE.Group(),crowd=createAmbientCrowd(root,items,options);
 try{
  const bodies=root.getObjectByName('Foule · silhouettes'),heads=root.getObjectByName('Foule · visages'),m=new THREE.Matrix4();
  assert.equal(crowd.diagnostics.drawCalls,2);assert.equal(bodies.material.vertexColors,false);assert.equal(heads.material.vertexColors,false);
  assert.ok(bodies.instanceColor&&heads.instanceColor);assert.ok(bodies.geometry.attributes.crowdJoint.array.some(j=>Math.abs(j)===2));
  bodies.geometry.computeBoundingBox();heads.geometry.computeBoundingBox();
  for(let i=0;i<bodies.count;i++){
   bodies.getMatrixAt(i,m);const body=bodies.geometry.boundingBox.clone().applyMatrix4(m);
   heads.getMatrixAt(i,m);const head=heads.geometry.boundingBox.clone().applyMatrix4(m);
   assert.ok(body.min.y>=7&&body.min.y<7.08,'feet on the ground');assert.ok(head.min.y<body.max.y,'head meets the neck');
  }
 }finally{crowd.dispose();}
 assert.equal(root.children.length,0);
});
test('crowd respects reduced motion while keeping residents visible',()=>{
 const root=new THREE.Group(),crowd=createAmbientCrowd(root,items,{...options,reducedMotion:true});
 try{
  const bodies=root.getObjectByName('Foule · silhouettes'),shader={uniforms:{},vertexShader:'#include <beginnormal_vertex>\n#include <begin_vertex>'};bodies.material.onBeforeCompile(shader);
  crowd.tick(15,{x:0,z:0},15000);assert.ok(crowd.diagnostics.visible>0);assert.equal(shader.uniforms.crowdWalkActive.value,0);
 }finally{crowd.dispose();}
});
