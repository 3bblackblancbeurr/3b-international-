import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {applySurfaceMaps,surfaceKinds,surfaceMaps} from '../src/world/avatar-surface.js';
import {normalizeAvatar} from '../src/world/avatar-rules.js';
import {FABRIC_CATALOG} from '../src/world/avatar-capabilities.js';

test('all creator textile profiles have deterministic finite PBR maps',()=>{
 for(const kind of surfaceKinds()){
  const a=surfaceMaps(kind),b=surfaceMaps(kind);
  assert.equal(a,b,kind+' surface should be cached');
  assert.equal(a.normalMap.image.width,64);assert.equal(a.normalMap.image.height,64);
  assert.equal(a.roughnessMap.image.width,64);
  assert.ok(a.normalMap.image.data.every(Number.isFinite));
  assert.ok(a.roughnessMap.image.data.every(Number.isFinite));
  const normalBlue=[];for(let i=2;i<a.normalMap.image.data.length;i+=4)normalBlue.push(a.normalMap.image.data[i]);
  assert.ok(Math.min(...normalBlue)>100&&Math.max(...normalBlue)<=255,kind+' invalid normal map');
 }
});

test('procedural PBR textile choices are normalized as real available creator materials',()=>{
 for(const kind of ['cotton','linen','satin','leather','denim','wool','knit','velvet','technical']){
  assert.equal(FABRIC_CATALOG[kind].available,true);
  assert.equal(normalizeAvatar({fabric:kind}).fabric,kind);
 }
 assert.equal(FABRIC_CATALOG.denim.surfaceSource,'procedural-pbr');
});

test('surface switching replaces only generated maps and preserves imported artist maps',()=>{
 const material=new THREE.MeshStandardMaterial();
 applySurfaceMaps(material,'cotton');const cotton=material.normalMap;
 applySurfaceMaps(material,'leather');assert.notEqual(material.normalMap,cotton);assert.equal(material.userData.threeBSurfaceKind,'leather');
 const importedNormal=new THREE.DataTexture(new Uint8Array([128,128,255,255]),1,1,THREE.RGBAFormat),importedRough=new THREE.DataTexture(new Uint8Array([180,180,180,255]),1,1,THREE.RGBAFormat);
 material.normalMap=importedNormal;material.roughnessMap=importedRough;applySurfaceMaps(material,'denim');
 assert.equal(material.normalMap,importedNormal);assert.equal(material.roughnessMap,importedRough);
 material.dispose();importedNormal.dispose();importedRough.dispose();
});
