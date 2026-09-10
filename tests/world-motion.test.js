import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {advanceMotion,pointerStick,createQualityController} from '../src/world/motion.js';
import {COUNTRIES} from '../src/world/catalog.js';
import {findPath} from '../src/world/navigation.js';

test('movement covers the same distance at 15, 30, 60 and 120 FPS',()=>{
 for(const fps of [15,30,60,120]){
  let state={position:{x:0,z:0},target:null,route:[]};
  for(let i=0;i<fps*2;i++)state=advanceMotion(state,{x:1,z:0},1/fps,10.5,[]);
  assert.ok(Math.abs(state.position.x-21)<1e-8,`speed at ${fps} FPS`);
 }
});
test('a route consumes short corners without overshoot at low frame rates',()=>{
 let s={position:{x:0,z:0},target:{x:.19,z:0},route:[{x:.19,z:.13},{x:0,z:.13}]};
 s=advanceMotion(s,{x:0,z:0},.1,10.5,[]);
 assert.ok(Math.hypot(s.position.x,s.position.z-.13)<1e-8);assert.equal(s.target,null);
});
test('long frames never tunnel through obstacles and release stops immediately',()=>{
 let s={position:{x:0,z:0},target:null,route:[]};
 s=advanceMotion(s,{x:1,z:0},.25,15,[{x:2,z:0,r:.2}]);assert.ok(s.position.x<1.11);
 const stopped=advanceMotion(s,{x:0,z:0},.1,15,[]);assert.deepEqual(stopped.position,s.position);assert.equal(stopped.moving,false);
 assert.deepEqual(pointerStick(3,3),{x:0,z:0});assert.equal(pointerStick(100,0).x,1);
});
test('manual steering cancels a path; diagonal movement is normalized',()=>{
 const s=advanceMotion({position:{x:0,z:0},target:{x:10,z:10},route:[{x:11,z:11}]},{x:1,z:-1},.1,10,[]);
 assert.equal(s.target,null);assert.equal(s.route.length,0);assert.ok(Math.abs(Math.hypot(s.position.x,s.position.z)-1)<1e-8);
});
test('quality adapts gradually and respects the screen pixel budget',()=>{
 const q=createQualityController(),ratio=q.ratio(3840,2160,2);assert.ok(3840*2160*ratio*ratio<=2073601);
 q.sample(25,1);assert.equal(q.sample(25,1),true);assert.ok(q.ratio(1000,700,2)<1.25);
 q.setMode('detail');assert.equal(q.sample(15,10),false);assert.equal(q.ratio(1000,700,2),1.5);
 q.setMode('fluid');assert.ok(q.ratio(1000,700,2)<=1);
});
test('all eight redesigned gates are reachable with the exported Blender collisions',()=>{
 const obstacles=JSON.parse(fs.readFileSync(new URL('../public/world/models/nexus-collisions.json',import.meta.url)));
 for(const c of COUNTRIES){
  const dest={x:c.portal[0],z:c.portal[1]},route=findPath({x:0,z:9},dest,obstacles);assert.ok(route.length,c.id);
  let s={position:{x:0,z:9},target:route[0],route:route.slice(1)};
  for(let i=0;i<600&&s.target;i++)s=advanceMotion(s,{x:0,z:0},1/15,10.5,obstacles);
  assert.ok(Math.hypot(s.position.x-dest.x,s.position.z-dest.z)<.15,c.id);
 }
});
test('Kaïs ships with a skinned mesh and separate Idle, Walk and Run clips',()=>{
 const b=fs.readFileSync(new URL('../public/world/models/kais-3d.glb',import.meta.url));
 const gltf=JSON.parse(b.subarray(20,20+b.readUInt32LE(12)));
 assert.ok(gltf.skins.length);assert.deepEqual(gltf.animations.map(a=>a.name).sort(),['Idle','Run','Walk']);
 assert.ok(gltf.meshes.every(m=>m.primitives.every(p=>p.attributes.JOINTS_0!==undefined&&p.attributes.WEIGHTS_0!==undefined)));
});
