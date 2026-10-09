import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {skyKeyDirection,masterRenderBudget,combatCameraView,createCameraImpulse} from '../src/world/master-presentation.js';
import {orbitView} from '../src/world/orbit.js';
import {createWorldSky} from '../src/world/sky.js';

test('the same bounded key direction can light the world and its sky through midnight',()=>{
 for(const hour of [-1,0,6,12,18,24,25]){
  const direction=skyKeyDirection(hour);
  assert.ok(Object.values(direction).every(Number.isFinite));
  assert.ok(Math.abs(Math.hypot(...Object.values(direction))-1)<1e-12);
  assert.ok(direction.y>0);
 }
 const before=skyKeyDirection(24-1/3600),after=skyKeyDirection(1/3600);
 assert.ok(Math.hypot(before.x-after.x,before.y-after.y,before.z-after.z)<.001);
 assert.ok(skyKeyDirection(6).x>0&&skyKeyDirection(18).x<0);
});

test('automatic mobile presentation keeps a slower shadow cadence and a bounded sky',()=>{
 const phone=masterRenderBudget('auto',{desktopClass:false}),computer=masterRenderBudget('detail',{desktopClass:true});
 assert.ok(phone.shadowInterval>=80&&phone.shadowInterval>computer.shadowInterval);
 assert.ok(phone.skyDetail<computer.skyDetail);
 assert.equal(masterRenderBudget('fluid').shadowInterval,Infinity);
});

test('combat framing fits nearby actors in portrait and landscape without moving game positions',()=>{
 for(const aspect of [390/844,.65,1,2.16])for(const distance of [7,16,22])for(const bearing of [0,.8,1.6,2.4,3.2,4,4.8,5.6]){
  const enemy={x:Math.sin(bearing)*distance,y:0,z:Math.cos(bearing)*distance},hero={x:0,y:0,z:0},copy=structuredClone({hero,enemy}),view=orbitView({yaw:.4,pitch:.23,distance:24},hero,0,aspect<.85);
  const framed=combatCameraView(view,hero,enemy,{aspect}),camera=new THREE.PerspectiveCamera(60,aspect,.3,1800);
  camera.position.set(framed.position.x,framed.position.y,framed.position.z);camera.lookAt(new THREE.Vector3(framed.target.x,framed.target.y,framed.target.z));camera.updateMatrixWorld();
  for(const actor of [hero,enemy])for(const y of [.2,3.4]){
   const point=new THREE.Vector3(actor.x,actor.y+y,actor.z).project(camera);
   assert.ok(Math.abs(point.x)<.93&&Math.abs(point.y)<.93&&point.z<1,'Both actors remain inside the actual perspective frustum');
  }
  assert.deepEqual({hero,enemy},copy);
  assert.equal(combatCameraView(view,hero,enemy,{enabled:false}),view);
  assert.equal(combatCameraView(view,hero,{x:100,y:0,z:0}),view);
 }
});

test('camera impulse requires real damage, remains bounded, settles and honors reduced motion',()=>{
 const impulse=createCameraImpulse();impulse.start({outgoing:0,incoming:0,action:'miss'},1);
 assert.deepEqual(impulse.sample(1.04),{x:0,y:0});
 impulse.start({outgoing:900,incoming:900},2);
 assert.ok(Math.abs(impulse.sample(2.02).x)<=.12);
 assert.deepEqual(impulse.sample(2.25),{x:0,y:0});
 const quiet=createCameraImpulse({reducedMotion:true});quiet.start({outgoing:100},1);
 assert.deepEqual(quiet.sample(1.04),{x:0,y:0});
 impulse.start({outgoing:20},3);impulse.clear();assert.deepEqual(impulse.sample(3.04),{x:0,y:0});
});

test('reduced cloud motion still follows weather and daylight changes',()=>{
 const sky=createWorldSky(null),camera=new THREE.PerspectiveCamera(),uniforms=sky.root.material.uniforms;
 try{
  sky.setAtmosphere({daylight:1,weather:'clear'});sky.update(camera,0,1/60);
  sky.setAtmosphere({daylight:.1,weather:'storm'});
  for(let frame=0;frame<600;frame++)sky.update(camera,0,1/60);
  assert.equal(uniforms.time.value,0,'cloud animation stays still');
  assert.ok(Math.abs(uniforms.daylight.value-.1)<.001);
  assert.ok(uniforms.cloudiness.value>.97&&uniforms.storminess.value>.99);
 }finally{sky.dispose();}
});
