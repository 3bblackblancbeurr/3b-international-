import test from 'node:test';import assert from 'node:assert/strict';import * as THREE from 'three';
import {createAmbientCrowd} from '../src/world/ambient-crowd.js';
import {bakeCrowdHuman} from '../src/world/crowd-human-model.js';
import {loadShippedCrowdFixture} from './crowd-glb-fixture.js';
const items=[{type:'hubBuilding'}],options={mode:'detail',viewport:1280,deviceMemory:8,groundY:()=>7},assetPromise=loadShippedCrowdFixture();

test('crowd uses the shipped human shape with grounded feet and four draws maximum',async()=>{
 const asset=await assetPromise,root=new THREE.Group(),crowd=createAmbientCrowd(root,items,{...options,modelAsset:asset});await crowd.ready;
 try{
  assert.equal(crowd.diagnostics.ready,true);assert.equal(crowd.diagnostics.error,null);assert.ok(crowd.diagnostics.visible>0);
  assert.ok(crowd.diagnostics.drawCalls<=4);assert.equal(crowd.diagnostics.models[0].source,'shipped-traveller-glb');assert.ok(crowd.diagnostics.models[0].nearTriangles<10000);
  const matrix=new THREE.Matrix4();for(const mesh of root.children[0].children){assert.equal(mesh.isInstancedMesh,true);assert.ok(mesh.geometry.attributes.crowdVertexId.count>1500);assert.ok(mesh.geometry.attributes.crowdTintClass.array.includes(1));assert.ok(mesh.geometry.attributes.crowdTintClass.array.includes(2));for(let i=0;i<mesh.count;i++){mesh.getMatrixAt(i,matrix);const bound=mesh.geometry.boundingBox.clone().applyMatrix4(matrix);assert.ok(bound.min.y>=7&&bound.min.y<7.01);assert.ok(bound.max.y>9.8);}}
 }finally{crowd.dispose();}
 assert.equal(root.children.length,0);
});

test('baked walk has real arm motion, finite normals and bounded half-float textures',async()=>{
 const baked=await bakeCrowdHuman(await assetPromise);
 try{
  assert.equal(baked.bakedPositions.type,THREE.HalfFloatType);assert.equal(baked.bakedNormals.type,THREE.HalfFloatType);assert.equal(baked.frames,16);assert.ok(baked.diagnostics.animationBytes<4*1024*1024);
  const values=baked.bakedPositions.image.data,stride=baked.rows*baked.width*4;let changed=0;
  for(let i=0;i<baked.diagnostics.vertices;i++){const offset=i*4,dx=Math.abs(THREE.DataUtils.fromHalfFloat(values[offset])-THREE.DataUtils.fromHalfFloat(values[stride*4+offset])),dy=Math.abs(THREE.DataUtils.fromHalfFloat(values[offset+1])-THREE.DataUtils.fromHalfFloat(values[stride*4+offset+1]));if(dx+dy>.015)changed++;}
  assert.ok(changed>baked.diagnostics.vertices*.1,'authored skeleton motion reached the shared atlas');
  assert.ok(baked.low.index.count<baked.geometry.index.count*.75);assert.ok(baked.bakedNormals.image.data.every(value=>Number.isFinite(THREE.DataUtils.fromHalfFloat(value))));
 }finally{baked.dispose();}
});

test('reduced motion freezes a visible human gait and disposing before async bake leaves no mesh',async()=>{
 const root=new THREE.Group(),crowd=createAmbientCrowd(root,items,{...options,modelAsset:await assetPromise,reducedMotion:true});await crowd.ready;
 try{const mesh=root.children[0].children[0],shader={uniforms:{},vertexShader:'#include <beginnormal_vertex>\n#include <begin_vertex>',fragmentShader:'#include <map_fragment>'};mesh.material.onBeforeCompile(shader);crowd.tick(15,{x:0,z:0},15000);assert.ok(crowd.diagnostics.visible>0);assert.equal(shader.uniforms.crowdWalkActive.value,0);assert.match(shader.vertexShader,/crowdAnimated/);assert.match(shader.fragmentShader,/crowdSurfaceTint/);}finally{crowd.dispose();}
 const other=createAmbientCrowd(root,items,{...options,modelAsset:await assetPromise});other.dispose();await other.ready;assert.equal(root.children.length,0);
});

test('both shipped body models retain bounded mobile population and actual camera LOD',async()=>{
 const male=await assetPromise,female=await loadShippedCrowdFixture(3),camera={position:{x:90,z:4}},root=new THREE.Group();
 const crowd=createAmbientCrowd(root,items,{...options,viewport:844,coarsePointer:true,modelAsset:male,modelLibrary:{load:async()=>female},camera});await crowd.ready;
 try{
  assert.equal(crowd.diagnostics.models.length,2);assert.equal(crowd.diagnostics.count,24);assert.ok(crowd.diagnostics.drawCalls<=4);assert.ok(crowd.diagnostics.triangles<24*8000);
  const near=crowd.diagnostics.triangles;camera.position={x:3000,z:3000};crowd.tick(1,{x:0,z:0},1000);assert.ok(crowd.diagnostics.triangles<near);
  assert.ok(crowd.diagnostics.models.every(model=>model.animationBytes<1600000));
 }finally{crowd.dispose();}
});
