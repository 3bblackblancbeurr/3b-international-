import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createBrokenCircleMaster} from '../src/world/hub/broken-circle-master.js';
import {HUB_AMBIENT_SOURCES} from '../src/world/hub/civic-soundscape.js';

test('Broken Circle master is articulated, physical and reactive',()=>{
 const root=new THREE.Group(),owned=[];
 const materials={
  dark:new THREE.MeshStandardMaterial({color:'#111820'}),
  gold:new THREE.MeshStandardMaterial({color:'#d6b46a'}),
  blue:new THREE.MeshStandardMaterial({color:'#55c9ef',emissive:'#55c9ef'}),
  stone:new THREE.MeshStandardMaterial({color:'#343b42'}),
 };
 const countries=Array.from({length:8},(_,i)=>({color:['#5dc8ff','#73d393','#d8b56a','#e18870','#ed6f72','#9aa5ff','#d8c787','#82cbd1'][i]}));
 const circle=createBrokenCircleMaster({root,owned,materials,countries});
 assert.deepEqual(circle.diagnostics,{rings:3,heritages:8,looseFragments:5,physical:true,articulated:true});
 const fixedMeshes=circle.groups.fixed.children.filter(child=>child.isMesh).length;
 assert.equal(fixedMeshes>=10&&fixedMeshes<=12,true);
 let totalMeshes=0;root.traverse(child=>{if(child.isMesh)totalMeshes++;});
 assert.equal(totalMeshes<28,true);
 circle.setProgress(4);circle.setDaylight(.2);circle.tick(10,12);
 assert.notEqual(circle.groups.rotorOuter.rotation.z,0);
 assert.notEqual(circle.groups.rotorInner.rotation.z,0);
 assert.equal(Math.sign(circle.groups.rotorOuter.rotation.z),-Math.sign(circle.groups.rotorInner.rotation.z));
 assert.equal(root.userData.brokenCircle.progress,4);
 assert.equal(root.userData.brokenCircle.near>0.8,true);
 for(const asset of owned)asset.dispose?.();Object.values(materials).forEach(m=>m.dispose());
});

test('Hub soundscape contains the physical Broken Circle resonance',()=>{
 const source=HUB_AMBIENT_SOURCES.find(s=>s.id==='machine:broken-circle');
 assert.ok(source);
 assert.equal(source.kind,'machine');
 assert.equal(source.x,0);assert.equal(source.z,0);
 assert.equal(source.radius>=90,true);
});
