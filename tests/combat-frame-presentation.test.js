import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {playAcceptedCombatReaction,createCameraImpulseLayer} from '../src/world/combat-frame-presentation.js';
import {createCameraImpulse} from '../src/world/master-presentation.js';
import {combatCue} from '../src/world/combat-effects.js';
import {startField,stepField} from '../src/world/field-combat.js';
import {createLivingActor} from '../src/world/living.js';
import {loadShippedCrowdFixture} from './crowd-glb-fixture.js';

const move=(p,d,s)=>({x:p.x+d.x*s,z:p.z+d.z*s});
const encounter=()=>({region:'france',turn:0,enemy:180,enemyMax:180,hp:100,maxHP:100,focus:3,stats:{attack:15,affinity:2,speed:1},intent:'frappe',field:startField({x:0,z:6},{x:0,z:0})});

test('accepted enemy gesture is consumed before a following player strike replaces the cue',()=>{
 const e=encounter();Object.assign(e.field,{phase:'windup',windup:0,recover:0});
 const impacted=stepField(e,{x:0,z:0},move),enemyCue=combatCue(e,impacted,'enemy'),events=[];
 const hero={action:name=>events.push('hero:'+name)},rival={controller:{object:{userData:{guardianIdentity:{region:'france'}}},setGuardianAnticipation:held=>events.push('held:'+held),action:name=>events.push('rival:'+name)}};
 playAcceptedCombatReaction(enemyCue,rival,hero);
 assert.deepEqual(events,['held:false','rival:GuardianAttack','hero:Hit']);
 const struck=stepField(impacted,{x:0,z:0,kind:'strike'},move),playerCue=combatCue(impacted,struck,'strike');
 playAcceptedCombatReaction(playerCue,rival,hero);
 assert.equal(events.filter(value=>value==='rival:GuardianAttack').length,1,'subsequent input cannot erase or duplicate the dispatched enemy gesture');
 assert.equal(events.filter(value=>value==='hero:Hit').length,1);
});

test('generic enemies keep their imported Attack and accepted defence/flight never causes a fake Hit',()=>{
 for(const state of [{guard:500},{dodge:300},{}]){
  const before=encounter();Object.assign(before.field,{phase:'windup',windup:0,recover:0,...state});
  const after=stepField(before,{x:0,z:0},move),cue=combatCue(before,after,'enemy'),actions=[],hero=[];
  playAcceptedCombatReaction(cue,{controller:{object:{userData:{}},action:name=>actions.push(name)}},{action:name=>hero.push(name)},{airborne:!state.guard&&!state.dodge});
  assert.deepEqual(actions,['Attack'],'patrols and the Oubli retain their existing animation');assert.deepEqual(hero,[]);
 }
});

test('composed camera impulses stay bounded from 30 to 240 FPS and remove their own residual before reset',()=>{
 for(const fps of [30,60,120,240])for(const reducedMotion of [false,true]){
  const impulse=createCameraImpulse({reducedMotion}),layer=createCameraImpulseLayer(),position=new T.Vector3(0,5,24),target=new T.Vector3(0,2,0),desired=position.clone();
  impulse.start({outgoing:999,incoming:999},0);
  for(let frame=1;frame<=fps/2;frame++){
   layer.remove(position);position.lerp(desired,1-Math.exp(-7/fps));
   layer.apply(position,target,impulse.sample(frame/fps));
   assert.ok(Math.hypot(position.x-desired.x,position.z-desired.z)<=.1200001,`${fps} FPS horizontal amplitude remains bounded`);
   assert.ok(Math.abs(position.y-desired.y)<=.0780001);
   if(reducedMotion)assert.ok(position.equals(desired));
  }
  layer.remove(position);assert.ok(position.distanceTo(desired)<1e-9,'no residual offset enters the next camera interpolation');
  impulse.clear();position.set(100,8,-30);const relocated=position.clone();layer.remove(position);assert.ok(position.equals(relocated),'cleared layer cannot subtract a stale offset after relocation');
 }
});

test('real guardian holds preparation through paused/extended clocks and releases once into an accepted attack',async()=>{
 const asset=await loadShippedCrowdFixture(4);let actor;
 await new Promise((ok,fail)=>{actor=createLivingActor({load:async()=>asset},{card:'C165',onLoad:ok,onError:fail});});
 try{
  actor.setGuardianAnticipation(true);for(let i=0;i<60;i++)actor.update(.1);
  assert.equal(actor.snapshotGuardian().animation,'GuardianAnticipation','six seconds cannot expire the accepted windup');
  const hand=actor.object.getObjectByName('hand_r'),held=hand.quaternion.clone().normalize();
  for(let i=0;i<40;i++){actor.setGuardianAnticipation(true);actor.update(.1);}
  assert.ok(held.angleTo(hand.quaternion.clone().normalize())<1e-6,'repeated accepted phase does not restart preparation');
  actor.action('Hit',.35);for(let i=0;i<6;i++)actor.update(.1);assert.equal(actor.snapshotGuardian().animation,'GuardianAnticipation','a real hit recovers into the still-pending preparation');
  playAcceptedCombatReaction({counter:true,intent:'percée',combo:1,incoming:0}, {controller:actor}, null);
  actor.update(.1);assert.equal(actor.snapshotGuardian().animation,'GuardianAttack3');
  for(let i=0;i<12;i++)actor.update(.1);assert.notEqual(actor.snapshotGuardian().animation,'GuardianAnticipation','recovery cannot re-enable the previous windup');
  actor.setGuardianAnticipation(true);actor.update(.1);actor.setGuardianAnticipation(false);actor.action('Death',2.5);for(let i=0;i<8;i++)actor.update(.1);assert.equal(actor.snapshotGuardian().animation,'Death','victory never resurrects the preparation pose');
 }finally{actor.dispose();}
});
