import test from 'node:test';
import assert from 'node:assert/strict';
import {createSceneFrameLoop} from '../src/components/scene-frame-loop.js';

function fixture(){
 let serial=0;const callbacks=new Map(),renders=[];
 const loop=createSceneFrameLoop({render:(...args)=>renders.push(args),requestFrame:fn=>{callbacks.set(++serial,fn);return serial;},cancelFrame:id=>callbacks.delete(id)});
 return {loop,renders,pending:()=>callbacks.size,tick(now){const batch=[...callbacks.values()];callbacks.clear();batch.forEach(fn=>fn(now));}};
}

test('decorative scene stays at 30 rendered fps on 60 and 120Hz displays',()=>{
 for(const hz of [60,120]){
  const f=fixture();f.loop.update({active:true});
  for(let i=0;i<=hz;i++)f.tick(i*1000/hz);
  assert.equal(f.renders.length,31);
  assert.equal(f.pending(),1);
  assert.ok(f.renders.every(([,dt])=>dt<=.05));
  f.loop.dispose();assert.equal(f.pending(),0);
 }
});

test('reduced motion and data saving retain one frame without a running loop',()=>{
 const f=fixture();f.loop.update({active:true,animate:false});f.tick(0);
 assert.equal(f.renders.length,1);assert.equal(f.pending(),0);
 f.tick(1000);assert.equal(f.renders.length,1);
 f.loop.invalidate();f.tick(1010);
 assert.equal(f.renders.length,2,'resize or texture arrival redraws a static scene');
 assert.deepEqual(f.renders.map(([,dt,moving])=>[dt,moving]),[[0,false],[0,false]]);
 f.loop.update({animate:true});f.tick(2000);assert.equal(f.renders.at(-1)[1],0);
 f.tick(2040);assert.equal(f.pending(),1);
 f.loop.update({animate:false});f.tick(2050);assert.equal(f.pending(),0);
});

test('tab hiding, offscreen content, overlays and lost context each stop rendering',()=>{
 for(const blocker of [{hidden:true},{visible:false},{covered:true},{active:false}]){
  const f=fixture();f.loop.update({active:true});f.tick(0);f.tick(40);
  f.loop.update(blocker);assert.equal(f.pending(),0);
  f.loop.invalidate();f.tick(40000);assert.equal(f.renders.length,2);
  const key=Object.keys(blocker)[0];f.loop.update({[key]:!blocker[key]});f.tick(50000);
  assert.equal(f.renders.length,3);assert.equal(f.renders.at(-1)[1],0,'resume never jumps after time away');
  f.loop.dispose();
 }
});

test('one cleared blocker cannot restart a scene still covered by another',()=>{
 const f=fixture();f.loop.update({active:true,hidden:true,covered:true});
 f.loop.update({hidden:false});assert.equal(f.pending(),0);
 f.loop.update({covered:false});assert.equal(f.pending(),1);
 f.loop.dispose();f.loop.update({active:true});f.loop.invalidate();f.tick(100);
 assert.equal(f.pending(),0);assert.deepEqual(f.renders,[]);
});
