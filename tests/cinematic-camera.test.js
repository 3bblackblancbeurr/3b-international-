import test from 'node:test';
import assert from 'node:assert/strict';
import {Vector3} from 'three';
import {readFileSync} from 'node:fs';
import {cinematicReturnView,cinematicEase,cinematicPhase,cinematicReturnBlend,cinematicDollyProgress,cinematicRiseProgress} from '../src/world/cinematic-camera.js';
import {DEFAULT_ORBIT,orbitView} from '../src/world/orbit.js';

test('cinematic return converts plain gameplay coordinates to independent vectors',()=>{
 for(const portrait of [false,true]){
  const orbit={...DEFAULT_ORBIT,yaw:.43},position={x:8,z:-4},heightAt=()=>2;
  const plain=orbitView(orbit,position,2,portrait,heightAt);
  const result=cinematicReturnView(orbit,position,2,portrait,heightAt);
  for(const key of ['position','target']){
   assert.equal(result[key].isVector3,true);
   assert.deepEqual(result[key].toArray(),[plain[key].x,plain[key].y,plain[key].z]);
   assert.doesNotThrow(()=>new Vector3().lerpVectors(result[key],result[key].clone(),.5));
  }
  result.position.x=999;
  assert.equal(position.x,8);
 }
});

test('the real opening cinematic uses the tested return-view contract',()=>{
 const source=readFileSync(new URL('../src/world/scene.js',import.meta.url),'utf8');
 assert.match(source,/const finalView=cinematicReturnView\(orbit,position,/);
 assert.match(source,/endCamera=finalView\.position;endTarget=finalView\.target;/);
 assert.doesNotMatch(source,/finalView\.(?:position|target)\.clone\(/);
});


test('cinematic phase curves are smooth bounded and preserve a low water opening',()=>{
 for(const value of [-1,0,.15,.5,.8,1,2]){
  const ease=cinematicEase(value);
  assert.ok(ease>=0&&ease<=1);
 }
 assert.equal(cinematicEase(0),0);
 assert.equal(cinematicEase(1),1);
 assert.ok(cinematicRiseProgress(.10,{waterReveal:true})<.01);
 assert.ok(cinematicRiseProgress(.50,{waterReveal:true})>.25);
 assert.equal(cinematicReturnBlend(.79,{waterReveal:true}),0);
 assert.ok(cinematicReturnBlend(.90,{waterReveal:true})>0);
 assert.equal(cinematicReturnBlend(1,{waterReveal:true}),1);
 assert.ok(cinematicDollyProgress(.30,{waterReveal:true})<cinematicDollyProgress(.70,{waterReveal:true}));
 assert.equal(cinematicPhase(.2,.2,.8),0);
 assert.equal(cinematicPhase(.8,.2,.8),1);
});

test('opening cinematic uses non-linear dolly rise and gameplay return',()=>{
 const source=readFileSync(new URL('../src/world/scene.js',import.meta.url),'utf8');
 assert.match(source,/cinematicRiseProgress\(age,\{waterReveal\}\)/);
 assert.match(source,/cinematicDollyProgress\(age,\{waterReveal\}\)/);
 assert.match(source,/cinematicReturnBlend\(age,\{waterReveal\}\)/);
 assert.match(source,/fovStart=70;fovEnd=58/);
 assert.match(source,/cityReveal:true/);
 assert.doesNotMatch(source,/Math\.max\(0,\(ease-\.72\)\/\.28\)/);
});
