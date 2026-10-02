import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {artLighting,REALM_ART,architecturalBudget,applyPhysicalQuality} from '../src/world/art-direction.js';
import {worldTimeSnapshot} from '../src/world/world-time.js';
import {resolveCameraObstruction} from '../src/world/camera-obstruction.js';
import {createStaticInstances} from '../src/world/static-instances.js';
import {createHeritageMonument} from '../src/world/heritage-monument.js';
import {createAmbientLife} from '../src/world/ambient-life.js';

test('all realms retain distinct bounded art profiles in daylight, night and fog',()=>{
 assert.equal(Object.keys(REALM_ART).length,9);
 for(const region of Object.keys(REALM_ART))for(const day of [.18,.55,1]){
  const p=artLighting(region,{daylight:day,sun:day,fog:.8},{visibility:.58});
  assert.ok(p.fogFar>p.fogNear*2);assert.ok(p.skyIntensity>0);assert.ok(p.environmentIntensity<1);assert.ok(p.exposure<=1);
 }
 assert.ok(artLighting('hub').fogFar>artLighting('france').fogFar*1.6);
 assert.notEqual(artLighting('hub',{daylight:.18}).palette.night,artLighting('france').palette.fog);
 assert.equal(architecturalBudget('fluid',true).transmission,false);
 assert.equal(architecturalBudget('auto',true).transmission,false);
 assert.equal(architecturalBudget('detail',false).transmission,false);
 assert.equal(architecturalBudget('detail',true).transmission,true);
});
test('sunrise and sunset are continuous across the former clock boundaries',()=>{
 for(const hour of [5,8,18,21]){
  const date=new Date(2026,9,2,hour,0,0),before=worldTimeSnapshot(new Date(+date-1000)),after=worldTimeSnapshot(new Date(+date+1000));
  assert.ok(Math.abs(before.daylight-after.daylight)<.002);assert.ok(Math.abs(before.sun-after.sun)<.002);
 }
});
test('mobile avoids refraction rerenders and desktop detail restores authored glass',()=>{
 const root=new THREE.Group(),material=new THREE.MeshPhysicalMaterial({transmission:.35}),geometry=new THREE.BoxGeometry();root.add(new THREE.Mesh(geometry,material));
 applyPhysicalQuality(root,'fluid',true);assert.equal(material.transmission,0);const version=material.version;
 applyPhysicalQuality(root,'fluid',true);assert.equal(material.version,version);
 applyPhysicalQuality(root,'detail',true);assert.equal(material.transmission,.35);
 applyPhysicalQuality(root,'detail',false);assert.equal(material.transmission,0);material.dispose();geometry.dispose();
});

const solid={x:0,z:8,width:4,depth:2,bottom:0,top:10,rotation:0};
test('camera stops before a building and does not move the player target',()=>{
 const target={x:0,y:3,z:0},copy={...target},eye={x:0,y:5,z:20};
 const result=resolveCameraObstruction(target,eye,[solid]);
 assert.ok(result.z<6.9&&result.z>5);assert.deepEqual(target,copy);
 assert.deepEqual(resolveCameraObstruction(target,eye,[{...solid,x:30}]),eye);
 assert.deepEqual(resolveCameraObstruction(target,eye,[{...solid,top:1}]),eye);
});
test('camera handles rotated boxes, origin inside a room and degenerate segments',()=>{
 const eye={x:0,y:3,z:20},target={x:0,y:3,z:0};
 const rotated=resolveCameraObstruction(target,eye,[{...solid,rotation:Math.PI/2}]);
 assert.ok(rotated.z<6);
 assert.deepEqual(resolveCameraObstruction(target,eye,[{...solid,z:0}]),eye);
 assert.deepEqual(resolveCameraObstruction(target,target,[solid]),target);
});
test('static batches respect item visibility, parent visibility and material ownership',()=>{
 const root=new THREE.Group(),parent=new THREE.Group();root.add(parent);
 const geometry=new THREE.BoxGeometry(),material=new THREE.MeshStandardMaterial(),sources=[];
 let geometryDisposed=0,materialDisposed=0;geometry.addEventListener('dispose',()=>geometryDisposed++);material.addEventListener('dispose',()=>materialDisposed++);
 for(let i=0;i<6;i++){const mesh=new THREE.Mesh(geometry,material);mesh.position.x=i*3;parent.add(mesh);sources.push(mesh);}
 const batches=createStaticInstances(root,new Map([['building',sources]]));
 assert.equal(batches.diagnostics.batches,1);assert.equal(batches.diagnostics.visibleInstances,6);
 sources[0].visible=false;batches.update();assert.equal(batches.diagnostics.visibleInstances,5);
 parent.visible=false;batches.update();assert.equal(batches.diagnostics.visibleInstances,0);
 parent.visible=true;batches.update();assert.equal(batches.diagnostics.visibleInstances,5);
 batches.dispose();batches.dispose();assert.ok(sources.every(s=>s.layers.mask===1));assert.equal(geometryDisposed,0);assert.equal(materialDisposed,0);
 geometry.dispose();material.dispose();
});
test('moving vehicles and transparent surfaces remain outside static batches',()=>{
 const root=new THREE.Group(),vehicle=new THREE.Group(),geometry=new THREE.BoxGeometry(),material=new THREE.MeshStandardMaterial();root.add(vehicle);
 const meshes=Array.from({length:4},()=>{const m=new THREE.Mesh(geometry,material);vehicle.add(m);return m;});
 const batch=createStaticInstances(root,new Map([['traffic',[vehicle]]]),{exclude:[vehicle]});
 assert.equal(batch.diagnostics.sourceMeshes,0);assert.ok(meshes.every(m=>m.layers.mask===1));batch.dispose();geometry.dispose();material.dispose();
});
test('physical monument has finite chamfered geometry, four draws and two solid supports',()=>{
 const asset=createHeritageMonument();assert.equal(asset.root.children.length,4);assert.equal(asset.collisions.length,2);
 let triangles=0;
 asset.root.traverse(o=>{if(!o.isMesh)return;triangles+=(o.geometry.index?.count||o.geometry.attributes.position.count)/3;assert.ok([...o.geometry.attributes.position.array].every(Number.isFinite));});
 assert.ok(triangles>10000&&triangles<35000);
 const bounds=new THREE.Box3().setFromObject(asset.root);assert.ok(bounds.max.y>23);assert.ok(asset.collisions.every(b=>Math.abs(b.x)>7));
 asset.setDaylight(.18);asset.dispose();asset.dispose();
});
test('ambient life budgets quality, remembers storms and honors reduced motion',()=>{
 const life=createAmbientLife('estonie');life.setQuality('fluid');assert.equal(life.root.children[0].geometry.drawRange.count,40);assert.equal(life.root.children[1].count,8);
 life.setAtmosphere({weather:'storm'});life.setAtmosphere({daylight:.3});assert.equal(life.root.children[1].visible,false);
 life.setAtmosphere({weather:'clear'});life.tick(1,{x:0,z:0});assert.equal(life.root.children[1].visible,true);life.dispose();
 const quiet=createAmbientLife('hub',{reducedMotion:true});quiet.setAtmosphere({weather:'clear'});assert.ok(quiet.root.children.every(o=>!o.visible));quiet.dispose();
});
