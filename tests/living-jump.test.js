import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {clone} from 'three/addons/utils/SkeletonUtils.js';
import {createLivingActor} from '../src/world/living.js';
import {PLAY_ACTIONS,createGameplayMotion,battleAnimation} from '../src/world/gameplay-motion.js';
import {weaponAnimations} from '../src/world/weapon-animation.js';
import {loadShippedCrowdFixture} from './crowd-glb-fixture.js';

async function actorFor(asset,index=0){
 let actor;
 await new Promise((resolve,reject)=>{actor=createLivingActor({load:async()=>asset},{avatar:{body:index<3?'homme':'femme',style:['voyageur','sentinelle','mystique'][index%3],weapon:'heritage',pattern:'uni'},onLoad:resolve,onError:message=>reject(new Error(message))});});
 return actor;
}

test('all six real rigs use the complete authored jump while moving, including knees and feet',async()=>{
 for(let index=0;index<6;index++){
  const asset=await loadShippedCrowdFixture(index),clip=asset.animations.find(c=>c.name==='Jump');
  assert.ok(clip,'shipped jump exists');
  const actor=await actorFor(asset,index),reference=clone(asset.scene),mixer=new T.AnimationMixer(reference);
  mixer.clipAction(clip).play();
  try{
   // Start a real running stride before jumping. Its lower layer must stop
   // rather than blend into the airborne legs just because movement continues.
   for(let i=0;i<20;i++)actor.update(.02,0,1,.096);
   actor.action('Jump',PLAY_ACTIONS.jump.duration);
   for(let frame=1;frame<=30;frame++){
    actor.update(.02,0,1,.096);
    mixer.setTime(frame*.02*clip.duration/PLAY_ACTIONS.jump.duration);
    if(frame<10)continue;
    for(const name of ['pelvis','thigh_l','thigh_r','calf_l','calf_r','foot_l','foot_r','upperarm_r']){
     const actual=actor.object.getObjectByName(name),expected=reference.getObjectByName(name);
     assert.ok(actual.quaternion.angleTo(expected.quaternion)<1e-5,`rig ${index} ${name} follows Jump, without an independent Run pose`);
     assert.ok(actual.position.distanceTo(expected.position)<1e-5,`rig ${index} ${name} preserves the authored jump translation`);
    }
   }
  }finally{actor.dispose();mixer.stopAllAction();mixer.uncacheRoot(reference);}
 }
});

test('landing resumes the running stride at its previous phase and releases the jump pose',async()=>{
 const asset=await loadShippedCrowdFixture(),actor=await actorFor(asset),run=asset.animations.find(c=>c.name==='Run'),reference=clone(asset.scene),mixer=new T.AnimationMixer(reference);
 mixer.clipAction(run).play();
 try{
  const step=.02,preFrames=20,duration=PLAY_ACTIONS.jump.duration,jumpFrames=Math.round(duration/step),postFrames=20;
  for(let i=0;i<preFrames;i++)actor.update(step,0,1,.096);
  actor.action('Jump',duration);
  for(let i=0;i<jumpFrames+postFrames;i++)actor.update(step,0,1,.096);
  // One gait update occurs on the landing frame itself. No stride time was
  // accumulated in the air, and the transition has now fully settled.
  mixer.setTime((preFrames+postFrames+1)*step);
  for(const name of ['thigh_l','thigh_r','calf_l','calf_r','foot_l','foot_r']){
   assert.ok(actor.object.getObjectByName(name).quaternion.clone().normalize().angleTo(reference.getObjectByName(name).quaternion.clone().normalize())<1e-5,name+' resumes the source running stride after landing');
  }
 }finally{actor.dispose();mixer.stopAllAction();mixer.uncacheRoot(reference);}
});

test('jump action respects the actor duration bounds and does not add a root launch translation',async()=>{
 const asset=await loadShippedCrowdFixture(),actor=await actorFor(asset),reference=await actorFor(asset);
 try{
  actor.action('Jump',.01);reference.action('Jump',.18);actor.update(.09,0,0,0);reference.update(.09,0,0,0);
  assert.ok(actor.object.getObjectByName('calf_r').quaternion.clone().normalize().angleTo(reference.object.getObjectByName('calf_r').quaternion.clone().normalize())<1e-5,'duration below .18 seconds uses the .18 second minimum, including the pose transition');
  assert.ok(actor.object.position.length()<1e-8,'world gameplay alone supplies the lift');
  const root=actor.object.getObjectByName('root');assert.ok(root.position.length()<1e-8,'the supplied jump is authored in place');
 }finally{actor.dispose();reference.dispose();}
});

test('combat impacts and player feedback preserve the real airborne pose',async()=>{
 const asset=await loadShippedCrowdFixture(),actor=await actorFor(asset),motion=createGameplayMotion(),clip=asset.animations.find(c=>c.name==='Jump'),reference=clone(asset.scene),mixer=new T.AnimationMixer(reference);
 mixer.clipAction(clip).play();
 try{
  for(let i=0;i<20;i++)actor.update(.02,0,1,.096);
  motion.start('jump');actor.action('Jump',PLAY_ACTIONS.jump.duration);
  for(let frame=1;frame<=30;frame++){
   for(const feedback of ['strike','power','guard','enemy','miss','dodge','support','trap']){
    const animation=battleAnimation(feedback,motion.airborne);if(animation)actor.action(animation);
   }
   motion.update(.02);actor.setCombat({});actor.update(.02,0,1,.096);
   mixer.setTime(frame*.02*clip.duration/PLAY_ACTIONS.jump.duration);
   if(frame<10)continue;
   for(const name of ['pelvis','thigh_r','calf_r','foot_r','upperarm_r'])assert.ok(actor.object.getObjectByName(name).quaternion.clone().normalize().angleTo(reference.getObjectByName(name).quaternion.clone().normalize())<1e-5,name+' keeps Jump through combat feedback instead of switching to Attack, Hit, Guard or Idle');
  }
 }finally{actor.dispose();mixer.stopAllAction();mixer.uncacheRoot(reference);}
});

test('a timed field guard lasts until its duration, while a driven exploration guard releases with its envelope',async()=>{
 const asset=await loadShippedCrowdFixture(),guard=weaponAnimations(asset.animations.find(c=>c.name==='Idle'),'heritage').find(c=>c.name==='Guard'),reference=clone(asset.scene),mixer=new T.AnimationMixer(reference);
 mixer.clipAction(guard).play();mixer.setTime(.6);
 const guardPose=reference.getObjectByName('upperarm_r').quaternion.clone().normalize();
 try{
  for(const driven of [false,true]){
   const actor=await actorFor(asset);
   try{
    actor.setCombat(driven?{guard:1}:{});actor.action('Guard',.95);
    for(let i=0;i<30;i++)actor.update(.02);
    assert.ok(actor.object.getObjectByName('upperarm_r').quaternion.clone().normalize().angleTo(guardPose)<1e-5,'the physical guard is still raised at .6 seconds');
    for(let i=0;i<30;i++)actor.update(.02);
    const angle=actor.object.getObjectByName('upperarm_r').quaternion.clone().normalize().angleTo(guardPose);
    assert.ok(driven?angle<1e-5:angle>.1,'the timed guard ends at .95 seconds; the driven guard stays raised');
    if(driven){actor.setCombat({guard:0});for(let i=0;i<15;i++)actor.update(.02);assert.ok(actor.object.getObjectByName('upperarm_r').quaternion.clone().normalize().angleTo(guardPose)>.1,'an explicit zero envelope releases the driven guard');}
   }finally{actor.dispose();}
  }
 }finally{mixer.stopAllAction();mixer.uncacheRoot(reference);}
});

test('a field attack can replace a timed guard without the old guard overriding its pose',async()=>{
 const asset=await loadShippedCrowdFixture(),actor=await actorFor(asset),attack=asset.animations.find(c=>c.name==='Attack'),reference=clone(asset.scene),mixer=new T.AnimationMixer(reference);
 try{
  actor.setCombat({});actor.action('Guard',.95);for(let i=0;i<15;i++)actor.update(.02);
  actor.action('Attack',.42);mixer.clipAction(attack).play();
  for(let i=0;i<12;i++)actor.update(.02);mixer.setTime(.24*attack.duration/.42);
  for(const name of ['upperarm_r','lowerarm_r','spine_02'])assert.ok(actor.object.getObjectByName(name).quaternion.clone().normalize().angleTo(reference.getObjectByName(name).quaternion.clone().normalize())<1e-5,name+' follows the attack while the previous guard duration has not elapsed');
 }finally{actor.dispose();mixer.stopAllAction();mixer.uncacheRoot(reference);}
});
