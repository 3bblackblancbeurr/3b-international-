import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createLensAdventure} from '../src/world/invisible/lens-adventure.js';
import {INVISIBLE_EPISODES} from '../src/world/invisible/catalog.js';

test('all eight original stages preserve inspectable models within a mobile geometry budget',()=>{
 const realmPalettes=new Set();
 for(const episode of INVISIBLE_EPISODES){
  const adventure=createLensAdventure(episode);realmPalettes.add(adventure.realm.cloth);
  assert.deepEqual([...adventure.objects.keys()],['portal','chest','fragment','guardian',...episode.points.map(point=>'clue:'+point.id)]);
  assert.ok(adventure.objects.get('guardian').getObjectByName('guardian-face'));
  let draws=0,triangles=0;for(const root of [adventure.content,adventure.environment])root.traverse(node=>{if(!node.isMesh)return;draws++;triangles+=(node.geometry.index?.count??node.geometry.attributes.position.count)/3*(node.isInstancedMesh?node.count:1);assert.equal(node.castShadow,false);});
  assert.ok(draws<=80,episode.id+' draw budget');assert.ok(triangles<35000,episode.id+' triangle budget');
  // Batched faces retain their model parent for both screen and native XR raycasts.
  adventure.content.updateMatrixWorld(true);const guardian=adventure.objects.get('guardian');
  const ray=new THREE.Raycaster(new THREE.Vector3(guardian.position.x,1.31,guardian.position.z+4),new THREE.Vector3(0,0,-1));
  const hits=ray.intersectObject(guardian,true);assert.ok(hits.length>0);let node=hits[0].object;while(node&&!node.userData.lensKey)node=node.parent;assert.equal(node.userData.lensKey,'guardian');
  adventure.dispose();
 }
 assert.equal(realmPalettes.size,8);
});

test('camera and AR hide the complete landscape and preserve artifact identities on return',()=>{
 const adventure=createLensAdventure(INVISIBLE_EPISODES[0]),guardian=adventure.objects.get('guardian'),position=guardian.position.clone();
 adventure.setMode('camera');assert.equal(adventure.environment.visible,false);assert.equal(adventure.objects.get('guardian'),guardian);assert.notDeepEqual(guardian.position.toArray(),position.toArray());
 adventure.setMode('ar');assert.equal(adventure.environment.visible,false);const bounds=new THREE.Box3();adventure.objects.forEach(group=>bounds.expandByObject(group));assert.ok(bounds.getSize(new THREE.Vector3()).x<5);
 adventure.setMode('3d');assert.equal(adventure.environment.visible,true);assert.deepEqual(guardian.position.toArray(),position.toArray());adventure.dispose();
});

test('authoritative progression controls the physical lid and portal without inventing discoveries',()=>{
 const episode=INVISIBLE_EPISODES[0],adventure=createLensAdventure(episode),lid=adventure.objects.get('chest').getObjectByName('hinged-coffer-lid');
 adventure.setProgress({solved:[episode.points[0].id],chestOpened:false,portalOpened:false});assert.equal(lid.rotation.x,0);
 adventure.update(30);assert.equal(lid.rotation.x,0,'Idle animation never opens a closed chest');
 adventure.setProgress({solved:episode.points.map(point=>point.id),chestOpened:true,portalOpened:true});assert.ok(lid.rotation.x< -1.4);
 adventure.setMode('camera');adventure.update(60);assert.ok(lid.rotation.x< -1.4,'Camera transitions retain opened progress');
 adventure.setProgress({solved:[],chestOpened:false,portalOpened:false});assert.equal(lid.rotation.x,0,'A different journey can return to closed state');adventure.dispose();
});

test('closing releases every owned geometry and material once, including batches and line edges',()=>{
 const adventure=createLensAdventure(INVISIBLE_EPISODES[3]);let geometries=0,materials=0,textures=0;
 const geometryCount=adventure.geometries.size,materialCount=adventure.materials.size;
 adventure.geometries.forEach(value=>value.addEventListener('dispose',()=>geometries++));adventure.materials.forEach(value=>value.addEventListener('dispose',()=>materials++));adventure.textures.forEach(value=>value.addEventListener('dispose',()=>textures++));
 adventure.dispose();adventure.dispose();adventure.update(20);assert.equal(geometries,geometryCount);assert.equal(materials,materialCount);assert.equal(textures,adventure.textures.size);assert.equal(adventure.content.children.length,0);assert.equal(adventure.environment.children.length,0);
});
