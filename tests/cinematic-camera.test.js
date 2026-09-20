import test from 'node:test';
import assert from 'node:assert/strict';
import {Vector3} from 'three';
import {readFileSync} from 'node:fs';
import {cinematicReturnView} from '../src/world/cinematic-camera.js';
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
