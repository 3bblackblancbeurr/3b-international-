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

const flightBones=['root','pelvis','thigh_l','thigh_r','calf_l','calf_r','foot_l','foot_r','ball_l','ball_r'];
function samePose(actor,reference,bones,message){
 for(const name of bones){const actual=actor.object.getObjectByName(name),expected=reference.getObjectByName(name);if(!actual&&!expected)continue;
  assert.ok(actual&&expected,name+' exists in both rigs');
  assert.ok(actual.quaternion.clone().normalize().angleTo(expected.quaternion.clone().normalize())<1e-5,message+' '+name+' rotation');
  assert.ok(actual.position.distanceTo(expected.position)<1e-5,message+' '+name+' translation');
 }
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

test('all six rigs layer aerial attacks, guard and powers over the untouched authored jump',async()=>{
 for(let index=0;index<6;index++){
  const asset=await loadShippedCrowdFixture(index),jump=asset.animations.find(c=>c.name==='Jump');
  for(const [name,duration] of [['Attack',.42],['Guard',.65],['Cast',.7]]){
   const actor=await actorFor(asset,index),reference=clone(asset.scene),jumpMixer=new T.AnimationMixer(reference),upperReference=clone(asset.scene),upperMixer=new T.AnimationMixer(upperReference);
   const clip=name==='Guard'?weaponAnimations(asset.animations.find(c=>c.name==='Idle'),'heritage').find(c=>c.name===name):asset.animations.find(c=>c.name===name);
   jumpMixer.clipAction(jump).play();const upper=upperMixer.clipAction(clip);upper.setLoop(T.LoopOnce,1);upper.clampWhenFinished=true;upper.play();
   try{
    for(let i=0;i<20;i++)actor.update(.02,0,1,.096);
    actor.action('Jump',PLAY_ACTIONS.jump.duration);for(let i=0;i<6;i++)actor.update(.02,0,1,.096);
    assert.equal(actor.airAction(name,duration),true,name+' is accepted in the air');
    assert.equal(actor.action('Hit',.35),false,'impact feedback cannot replace the jump');assert.equal(actor.action('Idle',.18),false,'idle feedback cannot replace the jump');
    for(let frame=1;frame<=24;frame++){
     actor.update(.02,0,1,.096);const elapsed=.12+frame*.02;jumpMixer.setTime(elapsed*jump.duration/PLAY_ACTIONS.jump.duration);
     samePose(actor,reference,flightBones,`rig ${index} ${name} frame ${frame} keeps Jump`);
     if(frame===10){upperMixer.setTime(.2*clip.duration/duration);samePose(actor,upperReference,['spine_02','upperarm_r','lowerarm_r'],`rig ${index} aerial ${name} uses its real action`);}
    }
   }finally{actor.dispose();jumpMixer.stopAllAction();upperMixer.stopAllAction();jumpMixer.uncacheRoot(reference);upperMixer.uncacheRoot(upperReference);}
  }
 }
});

test('an early aerial gesture returns to the current jump phase and a late power continues after landing',async()=>{
 const asset=await loadShippedCrowdFixture(),jump=asset.animations.find(c=>c.name==='Jump'),cast=asset.animations.find(c=>c.name==='Cast');
 for(const late of [false,true]){
  const actor=await actorFor(asset),reference=clone(asset.scene),mixer=new T.AnimationMixer(reference);
  try{
   for(let i=0;i<20;i++)actor.update(.02,0,1,.096);actor.action('Jump',PLAY_ACTIONS.jump.duration);
   const before=late?25:6;for(let i=0;i<before;i++)actor.update(.02,0,1,.096);
   actor.airAction(late?'Cast':'Attack',late?.7:.18);
   for(let i=0;i<(late?25:24);i++)actor.update(.02,0,1,.096);
   const clip=late?cast:jump,action=mixer.clipAction(clip);action.setLoop(T.LoopOnce,1);action.clampWhenFinished=true;action.play();mixer.setTime(late?.5*cast.duration/.7:.6*jump.duration/PLAY_ACTIONS.jump.duration);
   samePose(actor,reference,late?['spine_02','upperarm_r','lowerarm_r']:['pelvis','thigh_r','calf_r','foot_r','spine_02','upperarm_r','lowerarm_r'],late?'landing continues the unfinished Cast':'completed air attack recovers the current Jump phase');
   assert.equal(actor.airborne,!late);
  }finally{actor.dispose();mixer.stopAllAction();mixer.uncacheRoot(reference);}
 }
});

test('explicit airborne cancellation restores an idle pose while ordinary feedback cannot cancel it',async()=>{
 const asset=await loadShippedCrowdFixture(),actor=await actorFor(asset),idle=asset.animations.find(c=>c.name==='Idle'),reference=clone(asset.scene),mixer=new T.AnimationMixer(reference);
 try{
  actor.action('Jump',.72);actor.update(.2,0,1,.96);actor.airAction('Guard',.65);actor.update(.1);
  assert.equal(actor.action('Hit'),false);assert.equal(actor.airborne,true);assert.equal(actor.cancelAirborne(),true);assert.equal(actor.airborne,false);
  for(let i=0;i<15;i++)actor.update(.02);mixer.clipAction(idle).play();mixer.setTime(.3);
  samePose(actor,reference,['pelvis','thigh_r','calf_r','foot_r','upperarm_r'],'explicit pause/reset releases airborne layers');
  assert.equal(actor.airAction('Attack',.42),false,'air-only entrypoint cannot replace a ground action');
 }finally{actor.dispose();mixer.stopAllAction();mixer.uncacheRoot(reference);}
});

test('airborne timed and driven guards release separately without changing the flight pose',async()=>{
 const asset=await loadShippedCrowdFixture(),jump=asset.animations.find(c=>c.name==='Jump'),guard=weaponAnimations(asset.animations.find(c=>c.name==='Idle'),'heritage').find(c=>c.name==='Guard');
 const guardReference=clone(asset.scene),guardMixer=new T.AnimationMixer(guardReference);guardMixer.clipAction(guard).play();guardMixer.setTime(.8);
 try{
  for(const driven of [false,true]){
   const actor=await actorFor(asset),reference=clone(asset.scene),mixer=new T.AnimationMixer(reference);mixer.clipAction(jump).play();
   try{
    actor.action('Jump',.72);for(let i=0;i<6;i++)actor.update(.02,0,1,.096);
    actor.setCombat(driven?{guard:1}:{});actor.airAction('Guard',.2);for(let i=0;i<14;i++)actor.update(.02,0,1,.096);
    const angle=actor.object.getObjectByName('upperarm_r').quaternion.clone().normalize().angleTo(guardReference.getObjectByName('upperarm_r').quaternion.clone().normalize());
    assert.ok(driven?angle<1e-5:angle>.05,'only the driven airborne guard remains raised after its nominal duration');
    mixer.setTime(.4*jump.duration/.72);samePose(actor,reference,flightBones,'guard retains Jump legs');
    if(driven)actor.setCombat({guard:0});for(let i=0;i<10;i++)actor.update(.02,0,1,.096);
    mixer.setTime(.6*jump.duration/.72);samePose(actor,reference,[...flightBones,'upperarm_r','lowerarm_r'],'guard release recovers the current authored Jump');
   }finally{actor.dispose();mixer.stopAllAction();mixer.uncacheRoot(reference);}
  }
 }finally{guardMixer.stopAllAction();guardMixer.uncacheRoot(guardReference);}
});
