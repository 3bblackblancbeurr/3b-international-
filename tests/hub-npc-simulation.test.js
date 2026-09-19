import test from 'node:test';
import assert from 'node:assert/strict';
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
