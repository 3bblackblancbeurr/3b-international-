import test from 'node:test';
import assert from 'node:assert/strict';
import {hubNpcPose} from '../src/world/hub/npc-motion.js';
import {routePose} from '../src/world/hub/transport-motion.js';

test('Hub NPC motion is deterministic and stays close to home',()=>{
 const npc={id:'hub:npc:ines_varga',npcId:'ines_varga',x:12,z:-8};
 const a=hubNpcPose(npc,12),b=hubNpcPose(npc,12);
 assert.deepEqual(a,b);
 assert.ok(Math.hypot(a.x-npc.x,a.z-npc.z)<5);
});

test('Hub transport route interpolation loops through stops safely',()=>{
 const stops=[{x:0,z:0},{x:10,z:0},{x:10,z:10}];
 for(const t of [0,2,9,17,24,49]){
  const p=routePose(stops,t,24);
  assert.ok(Number.isFinite(p.x)&&Number.isFinite(p.z)&&Number.isFinite(p.heading));
  assert.ok(p.segment>=0&&p.segment<stops.length);
 }
});
