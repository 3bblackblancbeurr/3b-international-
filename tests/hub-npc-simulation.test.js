import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from 'three';
import {createLivingActor} from '../src/world/living.js';
import {hubNpcNeeds,hubNpcSimulation,hubNpcSocialContext,npcSimulationTier,NPC_SIMULATION_STATES} from '../src/world/hub/npc-motion.js';

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

test('approaching a resident stops them at their actual location and faces the player',()=>{
  const walker={...npc,activity:'promenade'},anchorPosition={x:11.6,z:-3.8},playerTarget={x:15,z:-4};
  for(const reducedMotion of [false,true]){
    const pose=hubNpcSimulation(walker,200,{distance:4,playerVisible:true,anchorPosition,playerTarget,reducedMotion});
    assert.equal(pose.state,'Observe');assert.equal(pose.moving,false);
    assert.equal(pose.x,anchorPosition.x);assert.equal(pose.z,anchorPosition.z);
    assert.ok(Math.abs(pose.heading-Math.atan2(playerTarget.x-pose.x,playerTarget.z-pose.z))<1e-10);
  }
});

test('a conversation holds the resident in place and overrides a social partner until it closes',()=>{
  const walker={...npc,activity:'promenade'},anchorPosition={x:11,z:-3},playerTarget={x:8,z:-2},socialTarget={x:13,z:-8};
  for(const time of [1,20,200]){
    const pose=hubNpcSimulation(walker,time,{distance:4,inConversation:true,anchorPosition,playerTarget,socialTarget});
    assert.equal(pose.state,'Talk');assert.equal(pose.moving,false);
    assert.equal(pose.x,anchorPosition.x);assert.equal(pose.z,anchorPosition.z);
    assert.equal(pose.heading,Math.atan2(playerTarget.x-pose.x,playerTarget.z-pose.z));
  }
  assert.equal(hubNpcSimulation(walker,200,{distance:12,playerTarget,socialTarget}).state,'Walk');
});

test('switching between full and simplified simulation changes cadence without moving the path',()=>{
  const walker={...npc,activity:'promenade'};
  for(const time of [0,20,200,3600]){
    const near=hubNpcSimulation(walker,time,{distance:23.99}),far=hubNpcSimulation(walker,time,{distance:24.01});
    assert.notEqual(near.updateHz,far.updateHz);
    assert.equal(near.x,far.x);assert.equal(near.z,far.z);assert.equal(near.heading,far.heading);
  }
});

test('social residents face a physically nearby partner at the live position',()=>{
  const actor={...npc,district:'gardens',socialPartnerId:'friend'},partner={npcId:'friend',district:'gardens',x:12,z:1,homeX:200,homeZ:200};
  assert.deepEqual(hubNpcSocialContext(actor,[actor,partner]),{socialTarget:{x:12,z:1,npcId:'friend'}});
  assert.deepEqual(hubNpcSocialContext(actor,[actor,{...partner,x:100}]),{});
});

test('resident activity requested before the model loads is applied to its animation',async()=>{
  for(const activity of ['Work','Talk']){
    let finishLoad,markReady;
    const loaded=new Promise(resolve=>{markReady=resolve;}),source=new THREE.Group(),body=new THREE.Object3D();body.name='body';source.add(body);
    const clip=(name,x)=>new THREE.AnimationClip(name,1,[new THREE.VectorKeyframeTrack('body.position',[0,1],[x,0,0,x,0,0])]);
    const actor=createLivingActor({load:()=>new Promise(resolve=>{finishLoad=resolve;})},{card:'C164',onLoad:markReady});
    try{
      actor.setActivity(activity);
      finishLoad({scene:source,animations:[clip('Idle',0),clip('Work',2),clip('Talk',4)]});
      await loaded;actor.update(.25);
      assert.equal(actor.object.getObjectByName('body').position.x,activity==='Work'?2:4);
      actor.setActivity(null);actor.update(.25);
      assert.equal(actor.object.getObjectByName('body').position.x,0);
    }finally{actor.dispose();}
  }
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
