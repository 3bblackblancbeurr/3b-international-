import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {upgradeVehicleProxyV7} from '../src/games/underground/VehicleProxyV7.js';
import {createProceduralSurfacePack,SurfaceUpgradeV7} from '../src/games/underground/ProceduralSurfaceV7.js';
import {WorldCompositionV7} from '../src/games/underground/WorldCompositionV7.js';

test('V7 procedural texture pack is data-backed and repeatable',()=>{
  const pack=createProceduralSurfacePack();
  assert.equal(pack.asphalt.color.isDataTexture,true);
  assert.equal(pack.limestone.bump.isDataTexture,true);
  assert.equal(pack.asphalt.color.wrapS,THREE.RepeatWrapping);
  for(const family of Object.values(pack))for(const tex of Object.values(family))tex.dispose();
});

test('V7 vehicle upgrade replaces block silhouette with sculpted meshes',()=>{
  const root=new THREE.Group();root.userData={assembly:{customization:{colors:{primary:'#111111',secondary:'#050505',accent:'#d7b76b',light:'#ffffff'},parts:[]}},wheels:[]};
  upgradeVehicleProxyV7(root);
  assert.equal(root.userData.proxyV7,true);
  assert.ok(root.getObjectByName('U3B_V7_SculptedBody'));
  assert.ok(root.getObjectByName('U3B_V7_Canopy'));
});

test('V7 surface upgrade binds bump/color maps',()=>{
  const world={materials:{road:new THREE.MeshPhysicalMaterial(),shoulder:new THREE.MeshStandardMaterial(),stone:new THREE.MeshStandardMaterial()},geometryV6:{materials:{stone:new THREE.MeshStandardMaterial(),stoneDark:new THREE.MeshStandardMaterial(),tunnel:new THREE.MeshStandardMaterial()}}};
  const upgrade=new SurfaceUpgradeV7(world);
  assert.ok(world.materials.road.map);
  assert.ok(world.materials.road.bumpMap);
  assert.ok(world.geometryV6.materials.stone.map);
  upgrade.dispose();
});

test('V7 France composition builds dense roadside scene',()=>{
  const scene=new THREE.Scene(),curve=new THREE.CatmullRomCurve3([new THREE.Vector3(-50,0,0),new THREE.Vector3(0,0,50),new THREE.Vector3(50,0,0),new THREE.Vector3(0,0,-50)],true);
  const v=new WorldCompositionV7(scene,curve,{id:'v7-test',countryId:'france'},{palette:{warm:0xffb66e,gold:0xd7b76b,matrix:0x356dff},quality:'low'});
  assert.equal(v.root.name,'U3B_WorldCompositionV7');
  assert.ok(v.root.children.length>50);
  assert.equal(v.update().worldCompositionV7,true);
});
