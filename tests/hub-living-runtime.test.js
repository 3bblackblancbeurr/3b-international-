import test from 'node:test';
import assert from 'node:assert/strict';
import {hubNpcPose} from '../src/world/hub/npc-motion.js';
import {routePose} from '../src/world/hub/transport-motion.js';
import {hubNpcSchedule} from '../src/world/hub/npc-schedule.js';
import fs from 'node:fs';

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


test('Hub inhabitants change routine at lunch evening and severe rain',()=>{
 const lunch=hubNpcSchedule('samir_benyahia',{hour:13,day:2,weather:'clear'});
 assert.equal(lunch.activity,'pause de midi');
 assert.equal(lunch.social,true);
 const evening=hubNpcSchedule('samir_benyahia',{hour:20,day:6,weather:'clear'});
 assert.equal(evening.activity,'rencontre publique');
 assert.equal(evening.social,true);
 const storm=hubNpcSchedule('samir_benyahia',{hour:13,day:2,weather:'storm'});
 assert.equal(storm.activity,'abri météo');
 assert.equal(storm.shelter,true);
 assert.equal(storm.district,'docks');
});

test('scene refreshes Hub schedules with the same live weather shown to the player',()=>{
 const scene=fs.readFileSync(new URL('../src/world/scene.js',import.meta.url),'utf8');
 const runtime=fs.readFileSync(new URL('../src/world/runtime-items.js',import.meta.url),'utf8');
 assert.match(runtime,/worldRuntimeItems\(region,save,context=\{\}\)/);
 assert.match(scene,/worldRuntimeItems\('hub',save,\{weather\}\)/);
 assert.match(scene,/refreshHubScheduleState\(\)/);
 assert.match(scene,/items=worldRuntimeItems\(region,save,\{weather\}\)/);
});
