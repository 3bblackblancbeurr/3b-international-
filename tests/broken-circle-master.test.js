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

function fixture(options={}){
 const root=new THREE.Group(),owned=[],materials=Object.fromEntries(['dark','gold','blue','stone'].map(k=>[k,new THREE.MeshStandardMaterial()]));
 const circle=createBrokenCircleMaster({root,owned,materials,...options});
 return {circle,dispose(){owned.forEach(a=>a.dispose());Object.values(materials).forEach(a=>a.dispose());}};
}

test('mechanical motion and bounded fracture match at 30, 60 and 120 fps',()=>{
 const frames=[30,60,120].map(fps=>{
  const f=fixture();try{
   f.circle.tick(0,10);for(let i=1;i<=fps*20;i++)f.circle.tick(i/fps,10);
   const {rotorOuter,rotorInner,fracture,fixed}=f.circle.groups;
   assert.equal(fixed.rotation.z,0);
   return [rotorOuter.rotation.z,rotorInner.rotation.z,...fracture.children.filter(m=>m.isMesh).flatMap(m=>[m.rotation.z,m.position.x,m.position.y])];
  }finally{f.dispose();}
 });
 for(const frame of frames.slice(1))for(let i=0;i<frame.length;i++)assert.ok(Math.abs(frame[i]-frames[0][i])<1e-9);
});

test('approaching after a long session does not jump the rotors; resume is bounded',()=>{
 const f=fixture();try{
  const c=f.circle;c.tick(0,150);for(let i=1;i<=3600;i++)c.tick(i/10,150);
  const before=c.groups.rotorOuter.rotation.z;c.tick(360.1,0);
  assert.ok(Math.abs(c.groups.rotorOuter.rotation.z-before)<.005);
  const near=c.groups.rotorOuter.rotation.z;c.tick(7200,0);
  assert.ok(Math.abs(c.groups.rotorOuter.rotation.z-near)<.011);
  const poses=c.groups.fracture.children.filter(m=>m.isMesh).map(m=>m.rotation.z);
  c.tick(7200,0);assert.deepEqual(c.groups.fracture.children.filter(m=>m.isMesh).map(m=>m.rotation.z),poses);
  c.tick(NaN,NaN);assert.ok(Number.isFinite(c.groups.rotorOuter.rotation.z));
 }finally{f.dispose();}
});

test('reduced motion keeps machinery, fragments and lighting still',()=>{
 const f=fixture({reducedMotion:true});try{
  const c=f.circle;c.tick(0,10);
  const light=c.groups.energy.children.find(m=>m.isPointLight),intensity=light.intensity;
  for(let i=1;i<=120;i++)c.tick(i/10,10);
  assert.equal(c.groups.rotorOuter.rotation.z,0);assert.equal(c.groups.rotorInner.rotation.z,0);
  assert.equal(c.groups.energy.scale.x,1);assert.equal(light.intensity,intensity);
  assert.equal(c.groups.fracture.children.find(m=>m.isPoints).rotation.z,0);
 }finally{f.dispose();}
});

test('fluid mode limits particles and local lights without removing the monument',()=>{
 const f=fixture();try{
  const c=f.circle,particles=c.groups.fracture.children.find(m=>m.isPoints),lights=c.groups.energy.children.filter(m=>m.isPointLight);
  c.setQuality('fluid');c.tick(0,10);assert.equal(particles.geometry.drawRange.count,12);
  assert.deepEqual(lights.map(l=>l.visible),[true,false]);assert.equal(c.groups.fixed.visible,true);
  c.setQuality('detail');c.tick(.1,10);assert.equal(particles.geometry.drawRange.count,128,'32 fracture motes plus 96 golden resonance sparks share one GPU batch');assert.ok(lights.every(l=>l.visible));
  c.tick(.2,250);assert.ok(lights.every(l=>!l.visible));
 }finally{f.dispose();}
});
