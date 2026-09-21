import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {hubNpcNeeds,hubNpcSimulation,npcSimulationTier,NPC_SIMULATION_STATES} from '../src/world/hub/npc-motion.js';

const npc={id:'hub:npc:mael_rivière',npcId:'mael_rivière',x:10,z:-5,homeX:10,homeZ:-5,activity:'travail'};

test('NPC simulation tiers scale from full to abstract by player distance',()=>{
  assert.equal(npcSimulationTier(10).tier,'full');
  assert.equal(npcSimulationTier(45).tier,'simplified');
  assert.equal(npcSimulationTier(120).tier,'abstract');
  assert.ok(npcSimulationTier(10).updateHz>npcSimulationTier(45).updateHz);
});

test('NPC needs and behavior stay deterministic and bounded',()=>{
  const needs=hubNpcNeeds(npc,120,{weather:'clear'});
  for(const value of Object.values(needs))assert.ok(value>=0&&value<=1);
  const a=hubNpcSimulation(npc,120,{distance:12,playerVisible:true,weather:'clear'});
  const b=hubNpcSimulation(npc,120,{distance:12,playerVisible:true,weather:'clear'});
  assert.deepEqual(a,b);
  assert.ok(NPC_SIMULATION_STATES.includes(a.state));
  assert.ok(Number.isFinite(a.x)&&Number.isFinite(a.z)&&Number.isFinite(a.heading));
});

test('nearby threats trigger flee while far NPCs become abstract',()=>{
  const flee=hubNpcSimulation(npc,10,{distance:8,threat:true});
  assert.equal(flee.state,'Flee');
  const far=hubNpcSimulation(npc,10,{distance:150,threat:true});
  assert.equal(far.tier,'abstract');
  assert.equal(far.x,npc.homeX);
  assert.equal(far.z,npc.homeZ);
});


test('working and talking NPCs stay anchored instead of orbiting their home',()=>{
  for(const activity of ['travail','rencontre publique']){
    const actor={...npc,activity};
    const a=hubNpcSimulation(actor,12,{distance:10});
    const b=hubNpcSimulation(actor,82,{distance:10});
    assert.equal(a.moving,false);
    assert.equal(b.moving,false);
    assert.ok(Math.hypot(a.x-actor.homeX,a.z-actor.homeZ)<.25);
    assert.ok(Math.hypot(b.x-actor.homeX,b.z-actor.homeZ)<.25);
  }
});

test('walking NPC path is deterministic but not a perfect home orbit',()=>{
  const walker={...npc,activity:'déplacement'};
  const samples=[10,25,40].map(time=>hubNpcSimulation(walker,time,{distance:10}));
  assert.ok(samples.every(p=>p.moving));
  const radii=samples.map(p=>Math.hypot(p.x-walker.homeX,p.z-walker.homeZ));
  assert.ok(Math.max(...radii)-Math.min(...radii)>.05);
});

test('visible NPC animation is rendered every frame while AI decisions stay throttled',()=>{
  const scene=fs.readFileSync(new URL('../src/world/scene.js',import.meta.url),'utf8');
  const living=fs.readFileSync(new URL('../src/world/living.js',import.meta.url),'utf8');
  assert.match(scene,/Decision making may run at 10\/3 Hz/);
  assert.match(scene,/actor\.controller\.update\(dt,mx,mz,moved\)/);
  assert.match(scene,/blend=1-Math\.exp\(-dt\*follow\)/);
  assert.doesNotMatch(scene,/actor\.object\.position\.set\(pose\.x,gy,pose\.z\)/);
  assert.match(living,/setActivity\(name\)/);
  assert.match(living,/ambientActivity&&actions\[ambientActivity\]/);
});
