import test from 'node:test';
import assert from 'node:assert/strict';
import {Vector3,PerspectiveCamera} from 'three';
import {createCityNaturalEnvironment,cityRidgeGeometry} from '../src/city/city3b-natural-environment.js';
test('natural scenery uses one sky, no cloud meshes, and animates water independently of population',()=>{
 const environment=createCityNaturalEnvironment();try{
  const camera=new PerspectiveCamera();camera.position.set(10,12,20);
  environment.configure(500,false);environment.update(12,camera);assert.equal(environment.water.uniforms.uTime.value,12);
  assert.deepEqual(environment.sky.position,new Vector3(10,12,20));assert.equal(environment.sky.children.length,0);
  assert.match(environment.water.fragmentShader,/crest/);assert.match(environment.water.fragmentShader,/reflect/);
  environment.configure(500,true);assert.equal(environment.water.uniforms.uNight.value,1);
  environment.update(42,camera,true);assert.equal(environment.water.uniforms.uTime.value,0);
 }finally{environment.dispose();}
});
test('distant mountains are bounded smooth irregular ridges rather than repeated pyramids',()=>{
 for(let layer=0;layer<3;layer++){const g=cityRidgeGeometry(500,layer);try{
  assert.equal(g.attributes.position.count,1771);assert.ok(g.attributes.position.array.every(Number.isFinite));assert.ok(g.attributes.normal.array.every(Number.isFinite));
  const p=g.attributes.position,heights=new Set();for(let i=0;i<161;i++)heights.add(Math.round(p.getY(i)));
  assert.ok(heights.size>30);g.computeBoundingBox();assert.ok(g.boundingBox.max.z< -500);assert.ok(g.boundingBox.min.y>=0);
 }finally{g.dispose();}}
});
